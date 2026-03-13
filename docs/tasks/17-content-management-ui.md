# Task 17: Content Management UI

## Overview

Build the content management interface for creating, editing, and managing posts with their scenes. Includes a scene editor with per-scene audio upload, status management, and filterable post listing.

## Subtasks

1. [ ] Create `apps/admin/src/features/posts/` — PostListPage with filterable table
2. [ ] PostCreatePage / PostEditPage: form with scene editor
3. [ ] Scene editor: sortable list with text fields and audio controls
4. [ ] Per-scene audio upload with duration display and status indicator
5. [ ] Create `apps/admin/src/hooks/use-posts.ts` — TanStack Query hooks
6. [ ] Verify: create post with scenes, upload audio per scene, edit post, filter/search posts

## Details

### Post List Page (`apps/admin/src/features/posts/post-list-page.tsx`)

Features:
- Table columns: Title, Niche, Status (badge), Scenes count, Format, Created date, Actions
- Filters: Niche dropdown, Status dropdown, Search input
- Pagination controls
- "Create Post" button → navigates to /posts/new
- Row click → navigates to /posts/:id/edit
- Actions dropdown: Edit, Duplicate, Delete (with confirmation dialog)

```typescript
export function PostListPage() {
  const [filters, setFilters] = useState({ nicheId: '', status: '', search: '', page: 1 });
  const { data, isLoading } = usePosts(filters);
  const niches = useNiches();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content</h1>
        <Button asChild><Link to="/posts/new">Create Post</Link></Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filters.nicheId} onValueChange={v => setFilters(f => ({ ...f, nicheId: v, page: 1 }))}>
          {/* Niche options */}
        </Select>
        <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v, page: 1 }))}>
          {/* Status options: draft, audio_pending, ready, rendering, rendered, published */}
        </Select>
        <Input placeholder="Search posts..." value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Niche</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scenes</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items.map(post => (
            <PostRow key={post.id} post={post} />
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Pagination ... />
    </div>
  );
}
```

### Post Create/Edit Page (`apps/admin/src/features/posts/post-edit-page.tsx`)

Form layout:
1. **Header Section**: Title input (large), Niche selector, Template selector, Format selector (story/post/landscape), Theme selector
2. **Scene Editor Section**: Sortable list of scenes (see below)
3. **Actions**: Save as Draft, Save & Set Audio Pending, Delete

```typescript
export function PostEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const { data: post } = usePost(id);
  const niches = useNiches();
  const templates = useTemplates();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();

  const [form, setForm] = useState({
    title: '',
    nicheId: '',
    templateId: '',
    format: 'story',
    theme: 'dark',
    scenes: [] as SceneInput[],
  });

  // Initialize form when post loads
  useEffect(() => {
    if (post) {
      setForm({
        title: post.title,
        nicheId: post.nicheId,
        templateId: post.templateId || '',
        format: post.format || 'story',
        theme: post.theme || 'dark',
        scenes: post.scenes.map(s => ({
          id: s.id,
          key: s.key,
          sortOrder: s.sortOrder,
          displayText: s.displayText,
          narrationText: s.narrationText,
          entrance: s.entrance || 'fade',
          textSize: s.textSize || 'md',
          audioUrl: s.audioUrl,
          durationSeconds: s.durationSeconds,
        })),
      });
    }
  }, [post]);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">{isNew ? 'Create Post' : 'Edit Post'}</h1>

      {/* Post metadata */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Input label="Title" value={form.title} onChange={...} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Niche" ... />
            <Select label="Template" ... />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Format" options={['story', 'post', 'landscape']} ... />
            <Select label="Theme" options={['default', 'dark', 'vibrant', 'minimal']} ... />
          </div>
        </CardContent>
      </Card>

      {/* Scene editor */}
      <SceneEditor
        scenes={form.scenes}
        onChange={scenes => setForm(f => ({ ...f, scenes }))}
        postId={id}
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => handleSave('draft')}>Save as Draft</Button>
        <Button variant="secondary" onClick={() => handleSave('audio_pending')}>
          Save & Request Audio
        </Button>
      </div>
    </div>
  );
}
```

### Scene Editor (`apps/admin/src/features/posts/scene-editor.tsx`)

A sortable list of scene cards. Each scene card has:
- Drag handle (for reordering)
- Key field (e.g., "hook", "point1", "conclusion")
- Display Text (textarea — the text shown on screen)
- Narration Text (textarea — the text to be spoken by TTS)
- Entrance animation selector (dropdown: fade, slideUp, slideDown, slideLeft, slideRight, zoom, none)
- Text size selector (dropdown: sm, md, lg, xl)
- Audio upload button + status indicator:
  - No audio: gray microphone icon + "Upload Audio" button
  - Has audio: green checkmark + duration display (e.g., "3.45s") + "Replace" button
- Delete scene button

Bottom of list: "Add Scene" button that appends a new empty scene.

```typescript
export function SceneEditor({ scenes, onChange, postId }: SceneEditorProps) {
  const uploadAudio = useUploadSceneAudio();

  const addScene = () => {
    const newScene: SceneInput = {
      key: `scene${scenes.length + 1}`,
      sortOrder: scenes.length,
      displayText: '',
      narrationText: '',
      entrance: 'fade',
      textSize: 'md',
    };
    onChange([...scenes, newScene]);
  };

  const removeScene = (index: number) => {
    const updated = scenes.filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, sortOrder: i }));
    onChange(updated);
  };

  const updateScene = (index: number, updates: Partial<SceneInput>) => {
    const updated = [...scenes];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleAudioUpload = async (index: number, file: File) => {
    if (!postId || !scenes[index].id) return;
    const result = await uploadAudio.mutateAsync({
      postId,
      sceneId: scenes[index].id!,
      file,
    });
    updateScene(index, {
      audioUrl: result.audio_url,
      durationSeconds: result.duration_seconds,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenes ({scenes.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scenes.map((scene, index) => (
          <SceneCard
            key={scene.key + index}
            scene={scene}
            index={index}
            onUpdate={(updates) => updateScene(index, updates)}
            onDelete={() => removeScene(index)}
            onAudioUpload={(file) => handleAudioUpload(index, file)}
          />
        ))}
        <Button variant="outline" className="w-full" onClick={addScene}>
          + Add Scene
        </Button>
      </CardContent>
    </Card>
  );
}
```

### TanStack Query Hooks (`apps/admin/src/hooks/use-posts.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function usePosts(filters: PostFilters) {
  const params = new URLSearchParams();
  if (filters.nicheId) params.set('nicheId', filters.nicheId);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page || 1));

  return useQuery({
    queryKey: ['posts', filters],
    queryFn: () => api.get(`/posts?${params}`),
  });
}

export function usePost(id?: string) {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => api.get(`/posts/${id}`),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostInput) => api.post('/posts', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePostInput> }) =>
      api.put(`/posts/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', id] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useUploadSceneAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, sceneId, file }: { postId: string; sceneId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload(`/posts/${postId}/scenes/${sceneId}/audio`, formData);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });
    },
  });
}
```

### Route Registration

Add to `apps/admin/src/App.tsx`:
```typescript
<Route path="/posts" element={<PostListPage />} />
<Route path="/posts/new" element={<PostEditPage />} />
<Route path="/posts/:id/edit" element={<PostEditPage />} />
```

## Verification

1. Post list page shows all posts with pagination
2. Filters work: niche dropdown, status dropdown, search box
3. Creating a new post with scenes saves correctly
4. Editing an existing post loads its scenes
5. Scene editor: add, remove, reorder scenes
6. Audio upload per scene: file picker, upload progress, duration display
7. Audio status indicator: gray=no audio, green=has audio
8. Status transitions work from the UI
9. Delete post shows confirmation dialog
10. Mobile responsive: forms stack vertically
