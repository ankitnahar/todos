import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotesPage } from '@/pages/NotesPage';
import { NoteDetailPage } from '@/pages/NoteDetailPage';
import { NoteCreatePage } from '@/pages/NoteCreatePage';
import { NoteEditPage } from '@/pages/NoteEditPage';
import { BucketViewPage } from '@/pages/BucketViewPage';
import { HotTopicsPage } from '@/pages/HotTopicsPage';
import { TagsPage } from '@/pages/TagsPage';
import { BucketsPage } from '@/pages/BucketsPage';
import { TeamMembersPage } from '@/pages/TeamMembersPage';
import { DeletedNotesPage } from '@/pages/DeletedNotesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="notes/new" element={<NoteCreatePage />} />
              <Route path="notes/:id" element={<NoteDetailPage />} />
              <Route path="notes/:id/edit" element={<NoteEditPage />} />
              <Route path="bucket-view" element={<BucketViewPage />} />
              <Route path="hot-topics" element={<HotTopicsPage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="buckets" element={<BucketsPage />} />
              <Route path="team-members" element={<TeamMembersPage />} />
              <Route path="deleted" element={<DeletedNotesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-color)',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
