# Task 19: Niche & Template Management UI

## Overview

Build admin pages for managing niches and browsing available video templates. Niche editor allows configuring niche-specific settings, and the template gallery shows all registered Remotion templates with metadata.

## Subtasks

1. [ ] Create `apps/admin/src/features/niches/` — NicheListPage with niche cards
2. [ ] Niche editor: create/edit niche with JSON config editor
3. [ ] Template gallery: grid of templates with metadata
4. [ ] Verify: niches display, can edit niche config, templates show correctly

## Details

### Niche List Page (`apps/admin/src/features/niches/niche-list-page.tsx`)

Display niches as cards (not a table, since there are typically <20 niches):

```typescript
export function NicheListPage() {
  const { data: niches, isLoading } = useNiches();
  const [editNiche, setEditNiche] = useState<Niche | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Niches</h1>
        <Button onClick={() => setShowCreate(true)}>Create Niche</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {niches?.items.map(niche => (
          <NicheCard key={niche.id} niche={niche} onEdit={() => setEditNiche(niche)} />
        ))}
      </div>

      <NicheEditorDialog
        niche={editNiche}
        open={!!editNiche || showCreate}
        onClose={() => { setEditNiche(null); setShowCreate(false); }}
      />
    </div>
  );
}
```

### Niche Card

Each card shows:
- Name and slug
- Default template name
- Voice ID
- Languages (as small badges)
- Post count (from API)
- Edit button

```typescript
function NicheCard({ niche, onEdit }: { niche: Niche; onEdit: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-primary transition" onClick={onEdit}>
      <CardHeader>
        <CardTitle className="flex justify-between">
          {niche.name}
          <Badge variant="outline">{niche.slug}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Template</span>
          <span>{niche.defaultTemplateId || 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Voice</span>
          <span>{niche.voiceId || 'Default'}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {niche.languages?.map(lang => (
            <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Niche Editor Dialog

Dialog with form fields:
- Name (text input)
- Slug (text input, auto-generated from name, editable)
- Default Template (dropdown from templates API)
- Voice ID (text input)
- Languages (multi-select or tag input)
- Config (JSON editor — a textarea with syntax highlighting or a structured form)

For the config JSON editor, use a textarea with monospace font and JSON validation:

```typescript
function NicheEditorDialog({ niche, open, onClose }: NicheEditorDialogProps) {
  const createNiche = useCreateNiche();
  const updateNiche = useUpdateNiche();
  const deleteNiche = useDeleteNiche();
  const templates = useTemplates();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    defaultTemplateId: '',
    voiceId: '',
    languages: [] as string[],
    config: '{}',
  });

  const [configError, setConfigError] = useState('');

  useEffect(() => {
    if (niche) {
      setForm({
        name: niche.name,
        slug: niche.slug,
        defaultTemplateId: niche.defaultTemplateId || '',
        voiceId: niche.voiceId || '',
        languages: niche.languages || [],
        config: JSON.stringify(niche.config || {}, null, 2),
      });
    } else {
      setForm({ name: '', slug: '', defaultTemplateId: '', voiceId: '', languages: [], config: '{}' });
    }
  }, [niche]);

  const handleSave = async () => {
    try {
      const config = JSON.parse(form.config);
      setConfigError('');

      const data = { ...form, config, languages: form.languages };

      if (niche) {
        await updateNiche.mutateAsync({ id: niche.id, data });
      } else {
        await createNiche.mutateAsync(data);
      }
      onClose();
    } catch (e) {
      if (e instanceof SyntaxError) {
        setConfigError('Invalid JSON');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{niche ? 'Edit Niche' : 'Create Niche'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => {
                const name = e.target.value;
                setForm(f => ({
                  ...f,
                  name,
                  slug: niche ? f.slug : name.toLowerCase().replace(/\s+/g, '-'),
                }));
              }} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Template</Label>
              <Select value={form.defaultTemplateId} onValueChange={v => setForm(f => ({ ...f, defaultTemplateId: v }))}>
                {templates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </Select>
            </div>
            <div>
              <Label>Voice ID</Label>
              <Input value={form.voiceId} onChange={e => setForm(f => ({ ...f, voiceId: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Languages</Label>
            {/* Tag input or comma-separated input */}
            <Input placeholder="en, am, ar" value={form.languages.join(', ')}
              onChange={e => setForm(f => ({ ...f, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
          </div>

          <div>
            <Label>Config (JSON)</Label>
            <Textarea
              className="font-mono text-sm min-h-[200px]"
              value={form.config}
              onChange={e => setForm(f => ({ ...f, config: e.target.value }))}
            />
            {configError && <p className="text-destructive text-sm mt-1">{configError}</p>}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {niche && (
            <Button variant="destructive" onClick={() => { deleteNiche.mutate(niche.id); onClose(); }}>
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Template Gallery Page (`apps/admin/src/features/niches/template-gallery.tsx`)

Display as a sub-tab or section within the niches page, or as a separate route.

```typescript
export function TemplateGallery() {
  const { data: templates, isLoading } = useTemplates();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Templates</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates?.map(template => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{template.description}</p>
              <div className="flex gap-1 flex-wrap">
                <Badge variant="outline">{template.category}</Badge>
                {template.tags?.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Formats: {template.supportedFormats?.join(', ')}
              </div>
              <div className="text-xs text-muted-foreground">
                Duration: {template.durationInFrames} frames @ {template.fps}fps
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### TanStack Query Hooks

```typescript
// apps/admin/src/hooks/use-niches.ts
export function useNiches() {
  return useQuery({
    queryKey: ['niches'],
    queryFn: () => api.get('/niches'),
  });
}

export function useCreateNiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNicheInput) => api.post('/niches', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['niches'] }),
  });
}

export function useUpdateNiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNicheInput }) => api.put(`/niches/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['niches'] }),
  });
}

export function useDeleteNiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/niches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['niches'] }),
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates'),
  });
}
```

### Route Registration

```typescript
<Route path="/niches" element={<NicheListPage />} />
<Route path="/templates" element={<TemplateGallery />} />
```

## Verification

1. Niche list page shows all niches as cards
2. Create niche: fill form, save, appears in list
3. Edit niche: click card, modify fields, save
4. JSON config editor validates JSON before saving
5. Delete niche shows confirmation, removes from list
6. Slug auto-generates from name on create, stays editable
7. Template gallery shows all 23 registered templates
8. Template cards display name, description, category, tags, formats
9. Niche default template dropdown populated from templates API
