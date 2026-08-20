export default function Starfield() {
  return (
    <div
      className="space-background"
      aria-hidden="true"
    >
      <div className="space-layer stars-a" />
      <div className="space-layer stars-b" />
      <div className="space-layer stars-c" />

      <div className="space-nebula nebula-one" />
      <div className="space-nebula nebula-two" />

      <div className="space-vignette" />
    </div>
  );
}
