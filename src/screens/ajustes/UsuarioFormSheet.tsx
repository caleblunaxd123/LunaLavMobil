import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { actualizarUsuario, crearUsuario, getRolesDeUsuario, sedesApi, type UsuarioEquipo } from '../../api/ajustesApi';
import { AppText, Button, Choice, InlineAlert, Sheet, TextField, toast } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { colors, space } from '../../theme';
import { emailValido, usuarioError } from '../../utils/validation';

/** Misma regla que la API: al menos 8 caracteres, con letras y números. */
export const passwordValida = (p: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(p);

/** Crear o editar un usuario del equipo: datos, rol, sede y contraseña (al editar, solo si se quiere cambiar). */
export function UsuarioFormSheet({ usuario, onClose }: { usuario: UsuarioEquipo | null; onClose: () => void }) {
  const me = useAuthStore((s) => s.session?.usuario);
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ['ajustes', 'roles-usuario', me?.negocioId], queryFn: getRolesDeUsuario });
  const sedes = useQuery({ queryKey: ['ajustes', 'sedes', me?.negocioId], queryFn: sedesApi.listar });
  const esYo = !!usuario && usuario.id === me?.id;

  const [nombre, setNombre] = useState(usuario?.nombreCompleto ?? '');
  const [login, setLogin] = useState(usuario?.usuario ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [password, setPassword] = useState('');
  const [rolId, setRolId] = useState<number | null>(usuario?.rolId ?? null);
  const [sedeId, setSedeId] = useState<number | null>(usuario?.sedeId ?? null);
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [touched, setTouched] = useState(false);

  const rolElegido = (roles.data ?? []).find((r) => r.id === rolId);
  const esAdmin = rolElegido?.codigo === 'ADMIN';
  const errors = {
    nombre: nombre.trim().length < 2 ? 'Escribe el nombre completo.' : '',
    login: usuarioError(login.trim()),
    email: email.trim() && !emailValido(email) ? 'El correo no tiene un formato válido.' : '',
    password: !usuario && !password ? 'Elige una contraseña.' : password && !passwordValida(password) ? 'Mínimo 8 caracteres, con letras y números.' : '',
    rol: rolId == null ? 'Elige un rol.' : '',
    sede: !esAdmin && sedeId == null ? 'Elige la sede donde trabaja.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = {
        usuario: login.trim(), nombreCompleto: nombre.trim(), email: email.trim() || null, password: password || null,
        rolId: rolId!, sedeId: esAdmin ? null : sedeId, activo,
      };
      if (usuario) await actualizarUsuario(usuario.id, cuerpo);
      else await crearUsuario({ ...cuerpo, password });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
      toast(usuario ? 'Usuario actualizado' : `«${nombre.trim()}» ya puede iniciar sesión`);
      onClose();
    },
  });

  return (
    <Sheet visible onClose={onClose} title={usuario ? 'Editar usuario' : 'Nuevo usuario'} subtitle={usuario ? `@${usuario.usuario}` : 'Podrá entrar con su usuario y contraseña'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Nombre completo" icon="person-outline" placeholder="Ej. María Torres" value={nombre} onChangeText={setNombre} maxLength={120}
          autoCapitalize="words" autoFocus={!usuario} error={touched ? errors.nombre : ''} />
        <TextField label="Usuario" icon="at-outline" placeholder="maria.torres" value={login} onChangeText={(v) => setLogin(v.replace(/\s/g, ''))} maxLength={50}
          autoCapitalize="none" autoCorrect={false} error={touched ? errors.login : ''} hint="Letras, números, punto, guion o guion bajo." />
        <TextField label="Correo" optional icon="mail-outline" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} maxLength={120}
          placeholder="maria@correo.com" error={touched ? errors.email : ''} />
        <TextField label={usuario ? 'Nueva contraseña' : 'Contraseña'} optional={!!usuario} icon="lock-closed-outline" password value={password} onChangeText={setPassword} maxLength={200}
          autoCapitalize="none" error={touched ? errors.password : ''} hint={usuario ? 'Déjala vacía para no cambiarla.' : 'Mínimo 8 caracteres, con letras y números.'} />
        <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>Rol</AppText>
          <View style={styles.choices}>
            {(roles.data ?? []).map((r) => <Choice key={r.id} label={r.nombre} selected={rolId === r.id} onPress={() => setRolId(r.id)} />)}
          </View>
          {touched && !!errors.rol && <AppText variant="caption" color={colors.danger}>{errors.rol}</AppText>}
        </View>
        {!esAdmin && <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>Sede</AppText>
          <View style={styles.choices}>
            {(sedes.data ?? []).filter((s) => s.activo || s.id === sedeId).map((s) => <Choice key={s.id} label={s.nombre} selected={sedeId === s.id} onPress={() => setSedeId(s.id)} />)}
          </View>
          {touched && !!errors.sede && <AppText variant="caption" color={colors.danger}>{errors.sede}</AppText>}
        </View>}
        {!esYo && <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="subheading">Puede iniciar sesión</AppText>
            <AppText variant="caption">{activo ? 'Activo' : 'Desactivado: no podrá entrar'}</AppText>
          </View>
          <Switch value={activo} onValueChange={setActivo} trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />
        </View>}
        {esYo && <AppText variant="caption">Eres tú: no puedes cambiar tu propio rol ni desactivarte.</AppText>}
        {guardar.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(guardar.error)} />}
      </ScrollView>
      <Button label={usuario ? 'Guardar cambios' : 'Crear usuario'} icon="checkmark" busy={guardar.isPending}
        onPress={() => { setTouched(true); if (valid) guardar.mutate(); }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { maxHeight: 520 },
  content: { gap: space.md, paddingBottom: space.sm },
  label: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
