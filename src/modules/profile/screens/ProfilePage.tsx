import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/profile.service';
import { getErrorMessage } from '@/utils/errors';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatar, setAvatar] = useState(profile?.avatar_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatar(profile.avatar_url || '');
    }
  }, [profile]);

  const initials = fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 200000) {
      toast.error('Image trop grande', { description: 'La taille maximale autorisée est 200 KB.' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      toast.error('Erreur lors de la lecture du fichier');
    };
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      if (typeof result !== 'string') {
        toast.error('Format de fichier invalide');
        return;
      }

      setAvatar(result);
      toast.success('Avatar mis à jour');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Veuillez entrer un nom');
      return;
    }

    setIsLoading(true);

    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        avatar_url: avatar || null,
      });
      await refreshProfile();
      toast.success('Profil mis à jour');
    } catch (error) {
      toast.error('Erreur', { description: getErrorMessage(error, 'Erreur lors de la sauvegarde') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles" />

      <div className="max-w-lg animate-fade-in-up">
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-4">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="h-20 w-20 rounded-full border-2 border-primary/20 object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-semibold">{fullName || 'Utilisateur'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Charger une image
              </Button>
              {avatar && (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleRemoveAvatar}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Supprimer
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">PNG, JPG ou GIF (max 200 KB)</p>
          </div>

          <div className="grid gap-4">
            <div>
              <Label>Nom complet</Label>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={user?.email || ''} disabled className="bg-muted" />
            </div>
            <Button onClick={handleSave} disabled={!fullName.trim() || isLoading}>
              <Save className="mr-2 h-4 w-4" /> Sauvegarder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
