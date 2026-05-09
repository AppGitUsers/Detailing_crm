import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  variant = 'danger',
  loading,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
          <AlertTriangle className="text-red-400" size={20} />
        </div>
        <p className="text-sm text-gray-300 pt-2">{message}</p>
      </div>
    </Modal>
  );
}
