import { Dialog } from '../../../components/ui/Dialog';
import type { DocumentoPreview } from '../hooks/useDocumentoPreview';

function ehVisualizavel(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

export function DocumentoPreviewDialog({
  preview,
  onOpenChange,
}: {
  preview: DocumentoPreview | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!preview} onOpenChange={onOpenChange} title={preview?.nome ?? 'Documento'} fitViewport className="max-w-5xl">
      {preview &&
        (ehVisualizavel(preview.mimeType) ? (
          <iframe
            src={preview.url}
            title={preview.nome}
            className="h-[80dvh] w-full rounded-lg border border-[var(--color-border)]"
          />
        ) : (
          <div className="flex h-[40dvh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">Pré-visualização não disponível para este tipo de arquivo.</p>
            <a href={preview.url} download={preview.nome} className="text-sm font-bold text-[var(--color-primary)] hover:underline">
              Baixar {preview.nome}
            </a>
          </div>
        ))}
    </Dialog>
  );
}
