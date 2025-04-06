import BlurryBlob from "./components/animata/background/blurry-blob";

export default function Page() {
  return <main className="h-screen flex items-center justify-center bg-gray-100">
    <BlurryBlob
      className="rounded-xl opacity-45"
      firstBlobColor="bg-purple-400"
      secondBlobColor="bg-blue-400"
    />
    <div className="animate-in fade-in zoom-in duration-1000 p-8 bg-white rounded-lg shadow-lg z-50">
      🎉 Hello Tailwind Animate!
    </div>
  </main>

}