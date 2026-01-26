import logo from "../assets/CroppedDevCheckLogo.png";
import LandingHeader from "../components/LandingHeader";
import { ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";

function Landing() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get("/checklists/user/");
      if (res.status === 200 || res.status === 201) {
        setLoggedIn(true);
      }
    } catch (err) {
      setLoggedIn(false);
      console.log("Failed to fetch user. Is the user logged in?", err);
    }
  };

  const scrollToAbout = (e) => {
    e.preventDefault();
    const aboutSection = document.getElementById("about");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <LandingHeader loggedIn={loggedIn} />

      <main>
        <section
          id="hero"
          className="relative bg-dark min-h-screen flex items-center justify-center pt-24"
        >
          <div className="flex flex-col items-center text-center max-w-3xl px-6">
            <img
              src={logo}
              alt="DevCheck logo"
              className="h-40 mb-8 object-contain"
            />

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Welcome to DevCheck
            </h1>

            <p className="text-xl md:text-2xl text-green font-medium italic mb-10">
              Simplify your programming workflow, track meaningful progress, and
              maximize efficiency through every stage of development.
            </p>
          </div>
          <a
            href="#about"
            onClick={scrollToAbout}
            className="absolute bottom-8 text-lg text-green hover:underline hover:text-khaki transition flex flex-col items-center cursor-pointer"
          >
            <span className="mb-4">Learn How DevCheck Works</span>
            <ArrowDown className="items-center animate-bounce"></ArrowDown>
          </a>
        </section>

        <section
          id="about"
          className="bg-dark min-h-screen flex relative justify-center items-center"
        >
          <div className="flex flex-col items-center text-center justify-center">
            <div className="mb-8 justify-center items-center">
              <h3 className="text-white font-bold md:text-2xl">
                Solo programming just got easier. With DevCheck, efficiency
                isn’t just attainable,{" "}
                <i className="text-blue">it’s guaranteed.</i>
              </h3>
            </div>

            <div className="flex justify-center items-center w-full mb-6">
              <span className="text-4xl font-bold text-white/50">
                DevCheck allows you to:
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-9 max-w-7xl mb-15 text-center">
              <div className="bg-green p-6 text-white text-2xl font-semibold rounded-lg hover:scale-102 shadow-lg flex items-center justify-center">
                <p>
                  Streamline your development workflow by creating and managing
                  tasks from MVP through deployment.
                </p>
              </div>

              <div className="bg-beige p-6 text-dark text-2xl font-semibold rounded-lg hover:scale-102 shadow-lg flex items-center justify-center">
                <p>
                  Track production bugs with precision and build a clear and
                  concise roadmap for continuous improvement.
                </p>
              </div>

              <div className="bg-blue p-6 text-dark text-2xl font-semibold rounded-lg hover:scale-102 shadow-lg flex items-center justify-center">
                <p>
                  Analyze your development habits and refine your process to
                  become a better programmer.
                </p>
              </div>
            </div>

            <div className="justify-center items-center max-w-3xl">
              <div className="mb-1">
                <span className="text-white/90">
                  As a student learning to code, I often struggled to bring my
                  project ideas to fruition. My projects often became more and
                  more bloated as I thought of new features that would make my
                  project way cooler, all the while making the goal of
                  deployment feel increasingly out of reach.
                </span>
              </div>
              <br />
              <div className="mb-1">
                <span className="text-white/90">
                  <b>
                    Building DevCheck changed the way I approach web
                    development.
                  </b>{" "}
                  Instead of pushing for perfection on my first attempt, I
                  accepted that mistakes were inevitable. This mindset allowed
                  me to create a more <b>structured plan</b> for success,
                  greatly increasing my <b>development speed</b> and{" "}
                  <b>productivity</b>, ultimately enabling me to build the
                  project I had always wanted to create.
                </span>
              </div>
              <br />
              <div className="text-white/90">
                <span>Thank you for checking out my site!</span>
              </div>
              {/* <div className="">
                <span className="text-white/90">
                  {" "}
                  <b>Coming Soon:</b>
                  <ul className="italic">
                    <li>Import from Figma feature</li>
                    <li>UI improvements for the checklist</li>
                    <li>Detailed user statistics displayed on the dashboard</li>
                  </ul>
                </span>
              </div> */}
            </div>

            <div className="justify-center items-center absolute bottom-8">
              {!loggedIn ? (
                <span className="text-white/30 italic font-semibold">
                  Like what you see?{" "}
                  <Link
                    to="/register"
                    className="mx-2 text-2xl font-bold text-green underline hover:text-khaki"
                  >
                    Register
                  </Link>
                  here!
                </span>
              ) : (
                <span className="text-white/30 italic font-semibold">
                  Back to the{" "}
                  <Link
                    to="/dashboard"
                    className="mx-2 text-2xl font-bold text-green underline hover:text-khaki"
                  >
                    Dashboard
                  </Link>{" "}
                  here!
                </span>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-dark text-white px-6 py-6">
        <div className="flex justify-between mx-auto text-center">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Wesley Lawson. All rights
            reserved.
          </p>
          <div className="flex gap-4">
            <Link
              to="https://github.com/wesley-lawson13/DevCheck"
              className="text-sm hover:underline"
            >
              Github
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Landing;
