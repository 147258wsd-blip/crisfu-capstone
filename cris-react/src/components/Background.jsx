/* Fixed decorative background: grid + two glows. Mounted once by Layout. */
export default function Background() {
  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="bg-grid" />
      <div className="bg-glow glow-a" />
      <div className="bg-glow glow-b" />
    </div>
  );
}
