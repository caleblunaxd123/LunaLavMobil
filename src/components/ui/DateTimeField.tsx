import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, space } from '../../theme';
import { parseDate } from '../../utils/format';
import { Button } from './Button';
import { Choice } from './Controls';
import { Sheet } from './Layout';
import { AppText } from './Text';

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha y hora local SIN zona ("2026-09-27T18:30:00"): así la guarda y la devuelve la API de LunaLav. */
export function toLocalIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Sugerencia por defecto de la web: hoy 6:30 p. m.; si ya pasó, mañana a la misma hora. */
export function defaultPickupDate() {
  const d = new Date();
  d.setHours(18, 30, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return toLocalIso(d);
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const d = parseDate(value);
  if (!Number.isFinite(d.getTime())) return 'Sin fecha';
  const day = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${formatHour(d.getHours(), d.getMinutes())}`;
};

/** «dom 27 set · 6:30 p. m.»: cabe en el botón de confirmar. */
function formatShort(d: Date) {
  const day = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/[.,]/g, '');
  return `${day} · ${formatHour(d.getHours(), d.getMinutes())}`;
}

function formatHour(h: number, m: number) {
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const SLOTS = Array.from({ length: 30 }, (_, i) => ({ h: 7 + Math.floor(i / 2), m: (i % 2) * 30 }));
const GROUPS = [
  { label: 'Mañana', from: 7, to: 12 },
  { label: 'Tarde', from: 12, to: 18 },
  { label: 'Noche', from: 18, to: 22 },
];

/**
 * Campo de fecha y hora para recojo/entrega. Muestra atajos rápidos y un calendario con horarios
 * cada 30 minutos; no deja elegir un momento pasado.
 */
export function DateTimeField({ label, value, onChange, hint, allowEmpty = false }: {
  label: string; value: string | null; onChange: (v: string | null) => void; hint?: string; allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.group}>
      <AppText variant="captionStrong" color={colors.text}>{label}</AppText>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${formatDateTime(value)}. Cambiar`}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <View style={styles.icon}><Ionicons name="calendar" size={20} color={colors.primary} /></View>
        <View style={styles.flex}>
          {value ? <>
            <AppText variant="subheading">{formatDateTime(value).split(' · ')[0]}</AppText>
            <AppText variant="caption"><AppText variant="captionStrong" color={colors.text}>{formatDateTime(value).split(' · ')[1]}</AppText> · {relativeLabel(value)}</AppText>
          </> : <AppText variant="subheading" color={colors.placeholder}>Sin fecha</AppText>}
        </View>
        <AppText variant="captionStrong" color={colors.primary}>Cambiar</AppText>
      </Pressable>
      {!!hint && <AppText variant="caption">{hint}</AppText>}
      {/* Se monta al abrir para que empiece siempre en el valor actual. */}
      {open && <DateTimeSheet visible title={label} value={value} allowEmpty={allowEmpty} onClose={() => setOpen(false)}
        onConfirm={(v) => { onChange(v); setOpen(false); }} />}
    </View>
  );
}

function relativeLabel(value: string) {
  const d = parseDate(value);
  const diffH = Math.round((d.getTime() - Date.now()) / 36e5);
  if (diffH < 0) return 'Ya pasó';
  if (diffH < 1) return 'En menos de una hora';
  if (diffH < 24) return `En ${diffH} ${diffH === 1 ? 'hora' : 'horas'}`;
  const days = Math.round(diffH / 24);
  return `En ${days} ${days === 1 ? 'día' : 'días'}`;
}

export function DateTimeSheet({ visible, title, value, onClose, onConfirm, allowEmpty }: {
  visible: boolean; title: string; value: string | null; onClose: () => void; onConfirm: (v: string | null) => void; allowEmpty?: boolean;
}) {
  const initial = value ? parseDate(value) : parseDate(defaultPickupDate());
  const [day, setDay] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), initial.getDate()));
  const [slot, setSlot] = useState<{ h: number; m: number } | null>({ h: initial.getHours(), m: initial.getMinutes() });
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  // La hoja se monta al abrirse: «ahora» se fija en ese momento.
  const [now] = useState(() => Date.now());
  const selected = slot ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.h, slot.m) : null;
  const valid = !!selected && selected.getTime() > now;

  const presets = useMemo(() => {
    const at = (addDays: number, h: number, m: number) => { const d = new Date(); d.setDate(d.getDate() + addDays); d.setHours(h, m, 0, 0); return d; };
    const plusHours = (h: number) => { const d = new Date(now + h * 36e5); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); return d; };
    return [
      { label: 'Hoy 6:30 p. m.', date: at(0, 18, 30) },
      { label: 'Mañana 10 a. m.', date: at(1, 10, 0) },
      { label: 'Mañana 6:30 p. m.', date: at(1, 18, 30) },
      { label: 'En 24 h', date: plusHours(24) },
      { label: 'En 48 h', date: plusHours(48) },
      { label: 'En 72 h', date: plusHours(72) },
    ].filter((p) => p.date.getTime() > now);
  }, [now]);

  const applyPreset = (d: Date) => {
    setDay(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSlot({ h: d.getHours(), m: d.getMinutes() });
  };

  // Celdas del mes (semana empieza lunes).
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: offset }, () => null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);
  const canPrev = month > new Date(today.getFullYear(), today.getMonth(), 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const slotPast = (s: { h: number; m: number }) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), s.h, s.m).getTime() <= now;
  const monthName = month.toLocaleDateString('es-PE', { month: 'long' });
  const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${month.getFullYear()}`;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle="Elige el día y la hora">
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        {presets.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
          {presets.map((p) => <Choice key={p.label} label={p.label} icon="flash-outline"
            selected={!!selected && Math.abs(selected.getTime() - p.date.getTime()) < 60_000} onPress={() => applyPreset(p.date)} />)}
        </ScrollView>}

        <View style={styles.monthBar}>
          <Pressable onPress={() => canPrev && setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} disabled={!canPrev}
            style={[styles.monthBtn, !canPrev && styles.disabled]} accessibilityLabel="Mes anterior" hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <AppText variant="subheading">{monthLabel}</AppText>
          <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.monthBtn}
            accessibilityLabel="Mes siguiente" hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {WEEKDAYS.map((w, i) => <AppText key={`${w}${i}`} variant="caption" align="center" style={styles.cell}>{w}</AppText>)}
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const past = d < today;
            const active = sameDay(d, day);
            const isToday = sameDay(d, today);
            return (
              <Pressable key={d.toISOString()} disabled={past} onPress={() => setDay(d)} style={styles.cell}
                accessibilityRole="button" accessibilityState={{ selected: active, disabled: past }}
                accessibilityLabel={d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}>
                <View style={[styles.dayCircle, isToday && styles.today, active && styles.dayActive]}>
                  <AppText style={[styles.dayText, past && styles.dayPast, active && styles.dayTextActive]}>{d.getDate()}</AppText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {GROUPS.map((g) => (
          <View key={g.label} style={styles.slotGroup}>
            <AppText variant="captionStrong">{g.label}</AppText>
            <View style={styles.slots}>
              {SLOTS.filter((s) => s.h >= g.from && s.h < g.to).map((s) => {
                const past = slotPast(s);
                const active = slot?.h === s.h && slot?.m === s.m;
                return (
                  <Pressable key={`${s.h}:${s.m}`} disabled={past} onPress={() => setSlot(s)}
                    style={[styles.slot, active && styles.slotActive, past && styles.disabled]}
                    accessibilityRole="radio" accessibilityState={{ checked: active, disabled: past }}>
                    <AppText style={[styles.slotText, active && styles.slotTextActive]}>{formatHour(s.h, s.m)}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
      {!valid && !!selected && <AppText variant="caption" color={colors.danger} align="center">Esa hora ya pasó. Elige otra.</AppText>}
      <Button label={valid ? `Usar ${formatShort(selected!)}` : 'Elige un día y una hora'} icon="checkmark"
        onPress={() => selected && onConfirm(toLocalIso(selected))} disabled={!valid} />
      {allowEmpty && <Button label="Sin fecha por ahora" variant="ghost" onPress={() => onConfirm(null)} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { opacity: 0.85 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sheetScroll: { maxHeight: 460 },
  sheetContent: { gap: space.md, paddingBottom: space.sm },
  presets: { gap: space.sm },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthBtn: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.primary },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  dayTextActive: { color: '#FFFFFF' },
  dayPast: { color: colors.placeholder },
  slotGroup: { gap: 6 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slot: { minWidth: '23%', flexGrow: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text },
  slotTextActive: { color: '#FFFFFF' },
  disabled: { opacity: 0.35 },
});
