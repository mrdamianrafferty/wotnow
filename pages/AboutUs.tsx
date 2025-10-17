import Image from "next/image";
import AppHeader from "../components/AppHeader"; // adjust path if your header lives elsewhere
import Footer from "../components/footer";       // matches usage in pages/index.tsx

export default function AboutUs() {
  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12">
        <div className="max-w-4xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-6">About Us</h1>

          <div className="mb-8 flex flex-col items-center">
            <Image
              src="/bruno.jpeg"
              alt="Bruno enjoying the river"
              width={400}
              height={300}
              className="rounded-xl shadow-lg w-full max-w-md"
            />
            <span className="text-secondary mt-4 text-lg font-semibold">Bruno, Chief Happiness Officer</span>
          </div>

          <p className="mb-4 leading-relaxed">
            Welcome to <strong>Go Daisy</strong> — where it’s pretty much just one man and his dog (Bruno) running the show.
          </p>

          <p className="mb-4 leading-relaxed">
            Our founder brings decades of digital wizardry shaped by time at the BBC, the UK government’s DCMS (yes, the folks who deal with culture and media),
            and legendary cultural titans like the Royal Botanic Gardens Kew, Southbank Centre, and The Royal Observatory.
            If you think that sounds a bit fancy, it is — but here, it’s all in the service of something simple: helping people live better lives.
          </p>

          <p className="mb-4 leading-relaxed">
            Once upon a time, our founder wrote histories of navigators — yes, the folks who looked at the stars and ocean and dreamed of new worlds.
            Those stories sparked a curiosity: what if we could use the mountains of weather, astronomy, and climate data that’s out there,
            not just to predict or inform, but to <em>get people off their phones</em> and back into the real world?
          </p>

          <p className="mb-4 leading-relaxed">
            Go Daisy is born from that dream: a mission to encourage people to spend more time with others, to play, to explore,
            and to soak in arts and culture — because those moments are what make life truly worth living.
          </p>

          <p className="mb-4 leading-relaxed">
            Behind the scenes, it’s a humble operation — one developer, one trusty dog companion, and a passion for transforming data into meaningful, joyful experiences.
            We don’t have an army or a big corporation. We have ideas, determination, and lots of coffee.
          </p>

          <p className="mb-6 leading-relaxed">
            If you find Go Daisy useful or inspiring, any help, feedback, or kind words are hugely appreciated.
            After all, this little project thrives because of a community that cares.
          </p>

          <p className="italic">
            Thanks for stopping by — now get outside and enjoy life!
          </p>

          <p className="mt-8 text-sm text-secondary-content">
            — The man, Bruno, and the Go Daisy team
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}

// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
