/** Dispara la descarga de un Blob en el browser con el nombre dado.
    Usa un <a> temporal + URL.createObjectURL, y libera la URL tras el click. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
