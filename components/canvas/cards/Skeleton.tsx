export function Skel({ height = 14, width }: { height?: number | string; width?: number | string }) {
  return (
    <div
      className="skel"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
      }}
    />
  );
}
