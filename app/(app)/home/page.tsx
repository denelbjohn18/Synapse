import { BoardListPage } from '@/components/boards/BoardListPage';

export default function HomePage() {
  return <BoardListPage filter={{ kind: 'all' }} title="Boards" />;
}
