import { BoardListPage } from '@/components/boards/BoardListPage';

export default function StarredPage() {
  return <BoardListPage filter={{ kind: 'starred' }} title="Starred" />;
}
