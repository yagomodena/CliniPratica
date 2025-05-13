
'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter, DialogClose } from '@/components/ui/dialog'; // Added DialogClose
import { LayoutDashboard, Users, Calendar, MessageSquare, BarChart, Settings, Landmark, UsersRound as UsersIcon } from 'lucide-react'; // Added UsersRound

// Define menu items with their IDs and labels for permissions
export const menuItemsConfig = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'mensagens', label: 'Mensagens', icon: MessageSquare },
  { id: 'financeiro', label: 'Financeiro', icon: Landmark },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
  { id: 'usuarios', label: 'Usuários', icon: UsersIcon },
] as const; // Use as const for stricter typing of id

type MenuItemId = typeof menuItemsConfig[number]['id'];

export type UserPermissions = {
  [key in MenuItemId]?: boolean;
};

export interface User {
  id: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  // Password is not stored here but handled in the form
}

export interface UserFormData extends Omit<User, 'id'> {
  password?: string;
  confirmPassword?: string;
  permissions: UserPermissions; // Explicitly state permissions
}

const passwordSchema = z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }).optional().or(z.literal(''));

const userFormSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  role: z.string().min(2, { message: 'O cargo deve ter pelo menos 2 caracteres.' }),
  password: passwordSchema,
  confirmPassword: passwordSchema,
  permissions: z.object(
    menuItemsConfig.reduce((acc, item) => {
      acc[item.id] = z.boolean().optional();
      return acc;
    }, {} as Record<MenuItemId, z.ZodOptional<z.ZodBoolean>>)
  ).default({}), // Provide a default empty object for permissions
}).refine(data => {
    // If password is provided, confirmPassword must match
    if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
    }
    return true; // No validation needed if password is not being changed/set
}, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
});


interface UserFormProps {
  onSubmit: (data: UserFormData) => void;
  initialData?: User;
  onCancel: () => void;
}

export function UserForm({ onSubmit, initialData, onCancel }: UserFormProps) {
  const isEditing = !!initialData;

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: initialData?.email || '',
      role: initialData?.role || '',
      password: '',
      confirmPassword: '',
      permissions: initialData?.permissions || menuItemsConfig.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}),
    },
  });

  const passwordValue = watch('password');


  const handleFormSubmit = (data: UserFormData) => {
    const submissionData: UserFormData = { ...data };
    // Remove password fields if they are empty and we are editing
    if (isEditing && !submissionData.password) {
      delete submissionData.password;
      delete submissionData.confirmPassword;
    }
    onSubmit(submissionData);
  };


  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-6 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">Email*</Label>
        <Input id="email" {...register('email')} className="col-span-3" />
        {errors.email && <p className="col-span-4 text-right text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="role" className="text-right">Cargo*</Label>
        <Input id="role" {...register('role')} className="col-span-3" />
        {errors.role && <p className="col-span-4 text-right text-sm text-destructive">{errors.role.message}</p>}
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="password" className="text-right">
          {isEditing ? 'Nova Senha' : 'Senha*'}
        </Label>
        <Input id="password" type="password" {...register('password')} className="col-span-3" placeholder={isEditing ? 'Deixe em branco para manter atual' : ''} />
        {errors.password && <p className="col-span-4 text-right text-sm text-destructive">{errors.password.message}</p>}
      </div>

      {(isEditing ? !!passwordValue : true) && ( // Show confirm password if new user or if password has value during edit
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="confirmPassword" className="text-right">
            {isEditing ? 'Confirmar Nova Senha' : 'Confirmar Senha*'}
            </Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} className="col-span-3" />
            {errors.confirmPassword && <p className="col-span-4 text-right text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>
      )}


      <div>
        <Label className="text-base font-semibold">Permissões de Acesso</Label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 p-4 border rounded-md bg-muted/30">
          {menuItemsConfig.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Controller
                name={`permissions.${item.id}` as const}
                control={control}
                defaultValue={initialData?.permissions?.[item.id] || false}
                render={({ field }) => (
                  <Checkbox
                    id={`permission-${item.id}`}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor={`permission-${item.id}`} className="font-normal flex items-center">
                <item.icon className="mr-1.5 h-4 w-4 text-muted-foreground" />
                {item.label}
              </Label>
            </div>
          ))}
        </div>
         {errors.permissions && <p className="text-sm text-destructive mt-1">{typeof errors.permissions.message === 'string' ? errors.permissions.message : 'Erro nas permissões'}</p>}
      </div>

      <DialogFooter>
        <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        </DialogClose>
        <Button type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar Usuário'}</Button>
      </DialogFooter>
    </form>
  );
}
