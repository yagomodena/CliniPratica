
'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { LayoutDashboard, Users, Calendar, BarChart, Settings, Landmark, UsersRound as UsersIcon, CreditCard, KeyRound } from 'lucide-react';

// Define menu items with their IDs and labels for permissions
export const menuItemsConfig = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'financeiro', label: 'Financeiro', icon: Landmark },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
  // Note: 'usuarios' is a sub-section of 'configuracoes', not a top-level menu item for permissions here.
] as const;

type MenuItemId = typeof menuItemsConfig[number]['id'];

export type UserPermissions = {
  [key in MenuItemId]?: boolean;
} & { // Add specific settings sub-permissions
  configuracoes_acesso_plano_assinatura?: boolean;
  configuracoes_acesso_gerenciar_usuarios?: boolean;
};

export interface User {
  id: string;
  nomeCompleto: string;
  areaAtuacao: '';
  criadoEm: string;
  fotoPerfilUrl: '';
  nomeEmpresa: '';
  plano: '';
  telefone: '';
  email: string;
  cargo: string;
  permissoes: UserPermissions;
}

export interface UserFormData extends Omit<User, 'id'> {
  password?: string;
  confirmPassword?: string;
  permissoes: UserPermissions;
}

const passwordSchema = z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }).optional().or(z.literal(''));

const basePermissionsSchema = menuItemsConfig.reduce((acc, item) => {
  acc[item.id] = z.boolean().optional();
  return acc;
}, {} as Record<MenuItemId, z.ZodOptional<z.ZodBoolean>>);

const userFormSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  cargo: z.string().min(2, { message: 'O cargo deve ter pelo menos 2 caracteres.' }),
  password: passwordSchema,
  confirmPassword: passwordSchema,
  permissoes: z.object({
    ...basePermissionsSchema,
    configuracoes_acesso_plano_assinatura: z.boolean().optional(),
    configuracoes_acesso_gerenciar_usuarios: z.boolean().optional(),
  }).default({}),
  nomeCompleto: z.string().min(3, { message: "Nome completo deve ter pelo menos 3 caracteres." }).optional().or(z.literal('')),
  nomeEmpresa: z.string().optional().or(z.literal('')),
  plano: z.string().optional().or(z.literal('')),
  telefone: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
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

  const defaultPerms = menuItemsConfig.reduce((acc, item) => ({ ...acc, [item.id]: false }), {});
  const defaultSubPerms = {
      configuracoes_acesso_plano_assinatura: false,
      configuracoes_acesso_gerenciar_usuarios: false,
  };

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      nomeCompleto: initialData?.nomeCompleto || '',
      areaAtuacao: '',
      criadoEm: '',
      fotoPerfilUrl: '',
      nomeEmpresa: initialData?.nomeEmpresa || '',
      plano: initialData?.plano || '',
      telefone: initialData?.telefone || '',
      email: initialData?.email || '',
      cargo: initialData?.cargo || 'Colaborador', // Default to Colaborador
      password: '',
      confirmPassword: '',
      permissoes: initialData?.permissoes || { ...defaultPerms, ...defaultSubPerms },
    },
  });

  const passwordValue = watch('password');


  const handleFormSubmit = (data: UserFormData) => {
    const submissionData: UserFormData = { ...data };
    if (isEditing && !submissionData.password) {
      delete submissionData.password;
      delete submissionData.confirmPassword;
    }
    onSubmit(submissionData);
  };


  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-6 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="nomeCompleto" className="text-right">Nome Completo*</Label>
        <Input id="nomeCompleto" {...register('nomeCompleto')} className="col-span-3" />
        {errors.nomeCompleto && <p className="col-span-4 text-right text-sm text-destructive">{errors.nomeCompleto.message}</p>}
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">Email*</Label>
        <Input id="email" {...register('email')} className="col-span-3" />
        {errors.email && <p className="col-span-4 text-right text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="cargo" className="text-right">Cargo*</Label>
        <Input id="cargo" {...register('cargo')} className="col-span-3" />
        {errors.cargo && <p className="col-span-4 text-right text-sm text-destructive">{errors.cargo.message}</p>}
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="password" className="text-right">
          {isEditing ? 'Nova Senha' : 'Senha*'}
        </Label>
        <Input id="password" type="password" {...register('password')} className="col-span-3" placeholder={isEditing ? 'Deixe em branco para manter atual' : ''} />
        {errors.password && <p className="col-span-4 text-right text-sm text-destructive">{errors.password.message}</p>}
      </div>

      {(isEditing ? !!passwordValue : true) && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="confirmPassword" className="text-right">
            {isEditing ? 'Confirmar Nova Senha' : 'Confirmar Senha*'}
          </Label>
          <Input id="confirmPassword" type="password" {...register('confirmPassword')} className="col-span-3" />
          {errors.confirmPassword && <p className="col-span-4 text-right text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>
      )}

      <div>
        <Label className="text-base font-semibold">Permissões de Acesso ao Menu Principal</Label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 p-4 border rounded-md bg-muted/30">
          {menuItemsConfig.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Controller
                name={`permissoes.${item.id}` as const}
                control={control}
                defaultValue={initialData?.permissoes?.[item.id] || false}
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
        {errors.permissoes && typeof errors.permissoes.message === 'string' && (
          <p className="text-sm text-destructive mt-1">{errors.permissoes.message}</p>
        )}
      </div>

      <div>
        <Label className="text-base font-semibold">Permissões Detalhadas (Configurações)</Label>
        <p className="text-xs text-muted-foreground mb-2">Requer que a permissão "Configurações" acima esteja marcada.</p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 border rounded-md bg-muted/30">
            <div className="flex items-center space-x-2">
              <Controller
                name="permissoes.configuracoes_acesso_plano_assinatura"
                control={control}
                defaultValue={initialData?.permissoes?.configuracoes_acesso_plano_assinatura || false}
                render={({ field }) => (
                  <Checkbox
                    id="permission-config-plano"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="permission-config-plano" className="font-normal flex items-center">
                <CreditCard className="mr-1.5 h-4 w-4 text-muted-foreground" />
                Acessar Plano e Assinatura
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="permissoes.configuracoes_acesso_gerenciar_usuarios"
                control={control}
                defaultValue={initialData?.permissoes?.configuracoes_acesso_gerenciar_usuarios || false}
                render={({ field }) => (
                  <Checkbox
                    id="permission-config-usuarios"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="permission-config-usuarios" className="font-normal flex items-center">
                <UsersIcon className="mr-1.5 h-4 w-4 text-muted-foreground" />
                Gerenciar Usuários (Plano Clínica)
              </Label>
            </div>
        </div>
         {/* Displaying errors for sub-permissions if they exist */}
        {errors.permissoes?.configuracoes_acesso_plano_assinatura && (
          <p className="text-sm text-destructive mt-1">{errors.permissoes.configuracoes_acesso_plano_assinatura.message}</p>
        )}
        {errors.permissoes?.configuracoes_acesso_gerenciar_usuarios && (
          <p className="text-sm text-destructive mt-1">{errors.permissoes.configuracoes_acesso_gerenciar_usuarios.message}</p>
        )}
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
