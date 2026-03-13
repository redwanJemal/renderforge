# Task 20: Settings Page

## Overview

Build the settings page with tabs for user profile management, storage status, BGM library management, and API key configuration.

## Subtasks

1. [ ] Create `apps/admin/src/features/settings/` — SettingsPage with tabs
2. [ ] Profile tab: update name, email, password
3. [ ] Storage tab: MinIO connection status, bucket info
4. [ ] BGM Library tab: list, upload, delete, play preview
5. [ ] Verify: settings page loads, profile update works, BGM management works

## Details

### Settings Page (`apps/admin/src/features/settings/settings-page.tsx`)

```typescript
export function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="bgm">BGM Library</TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileSettings /></TabsContent>
        <TabsContent value="storage"><StorageSettings /></TabsContent>
        <TabsContent value="bgm"><BGMSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
```

### Profile Tab

```typescript
function ProfileSettings() {
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  return (
    <div className="space-y-6 pt-4">
      {/* Profile Info */}
      <Card>
        <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Button onClick={() => updateProfile.mutate(profileForm)}>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input type="password" value={passwordForm.currentPassword} onChange={...} />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={passwordForm.newPassword} onChange={...} />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={passwordForm.confirmPassword} onChange={...} />
          </div>
          <Button onClick={() => {
            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
              toast.error('Passwords do not match');
              return;
            }
            changePassword.mutate(passwordForm);
          }}>Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Profile API Routes

Add to `apps/api/src/routes/auth.ts`:

```typescript
// PUT /api/auth/profile — update name/email
authRoutes.put('/profile', async (c) => {
  const user = c.get('user');
  const { name, email } = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
  }).parse(await c.req.json());

  const [updated] = await db.update(users)
    .set({ name, email, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return c.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });
});

// PUT /api/auth/password — change password
authRoutes.put('/password', async (c) => {
  const user = c.get('user');
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  }).parse(await c.req.json());

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) return c.json({ error: 'Current password is incorrect' }, 400);

  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));

  return c.json({ message: 'Password updated' });
});
```

### Storage Tab

Show MinIO connection status and bucket information:

```typescript
function StorageSettings() {
  const { data: storageInfo } = useQuery({
    queryKey: ['storage-info'],
    queryFn: () => api.get('/settings/storage'),
  });

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Storage (MinIO)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={storageInfo?.connected ? 'default' : 'destructive'}>
            {storageInfo?.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Endpoint</span>
          <span className="font-mono text-sm">{storageInfo?.endpoint}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Bucket</span>
          <span>{storageInfo?.bucket}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Objects</span>
          <span>{storageInfo?.objectCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

Add API route:
```typescript
// GET /api/settings/storage
settingsRoutes.get('/storage', async (c) => {
  try {
    const objects = await storage.list('');
    return c.json({
      connected: true,
      endpoint: config.S3_ENDPOINT,
      bucket: config.S3_BUCKET,
      objectCount: objects.length,
    });
  } catch {
    return c.json({ connected: false, endpoint: config.S3_ENDPOINT, bucket: config.S3_BUCKET });
  }
});
```

### BGM Library Tab

```typescript
function BGMSettings() {
  const { data: tracks } = useQuery({
    queryKey: ['bgm-tracks'],
    queryFn: () => api.get('/bgm'),
  });
  const uploadBGM = useUploadBGM();
  const deleteBGM = useDeleteBGM();
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = async (trackId: string) => {
    if (playing === trackId) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    const track = await api.get(`/bgm/${trackId}`);
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play();
      setPlaying(trackId);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />

      {/* Upload */}
      <Card>
        <CardHeader><CardTitle>Upload BGM Track</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            await uploadBGM.mutateAsync(formData);
            e.currentTarget.reset();
          }} className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Name</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Category</Label>
              <Input name="category" placeholder="motivational" />
            </div>
            <div>
              <Label>File</Label>
              <Input name="file" type="file" accept="audio/*" required />
            </div>
            <Button type="submit" disabled={uploadBGM.isPending}>Upload</Button>
          </form>
        </CardContent>
      </Card>

      {/* Track List */}
      <Card>
        <CardHeader><CardTitle>BGM Tracks ({tracks?.items?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks?.items?.map(track => (
                <TableRow key={track.id}>
                  <TableCell>{track.name}</TableCell>
                  <TableCell><Badge variant="outline">{track.category}</Badge></TableCell>
                  <TableCell>{parseFloat(track.durationSeconds).toFixed(1)}s</TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handlePlay(track.id)}>
                      {playing === track.id ? 'Stop' : 'Play'}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive"
                      onClick={() => deleteBGM.mutate(track.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Route Registration

```typescript
<Route path="/settings" element={<SettingsPage />} />
```

Add API routes:
```typescript
import { settingsRoutes } from './routes/settings';
app.route('/api/settings', settingsRoutes);
```

## Verification

1. Settings page loads with tabs
2. Profile tab: update name and email, see changes reflected
3. Password change: requires correct current password, validates match
4. Storage tab: shows MinIO connection status, bucket name, object count
5. BGM Library: lists all tracks with metadata
6. BGM upload: upload new track, appears in list with detected duration
7. BGM play: click Play, audio plays in browser, click again to stop
8. BGM delete: removes track from list and MinIO
9. All forms show loading states and success/error toasts
