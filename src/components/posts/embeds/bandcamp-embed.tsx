export function BandcampEmbed({ embedVideoUrl }: { embedVideoUrl: string }) {
  return (
    <iframe
      className="aspect-video rounded-lg h-30 bg-white"
      src={embedVideoUrl}
      allowFullScreen
    />
  );
}
