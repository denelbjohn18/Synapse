import { BoardListPage } from '@/components/boards/BoardListPage';

export default function TrashPage() {
  return <BoardListPage filter={{ kind: 'trash' }} title="Trash" />;
}
