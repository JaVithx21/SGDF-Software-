import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export default async function UsersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: users, error } = await supabase
    .from('users')
    .select('nombre,email');

  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("Usuarios obtenidos exitosamente desde Supabase:");
    console.log(users);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Prueba de Conexión: Usuarios</h1>
      {error ? (
        <p className="text-red-500">Hubo un error al obtener los usuarios. Revisa la consola del servidor.</p>
      ) : (
        <ul className="list-disc pl-5">
          {users?.map((user, i) => (
            <li key={i} className="mb-2">
              <span className="font-medium">{user.nombre}</span> - <span>{user.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
