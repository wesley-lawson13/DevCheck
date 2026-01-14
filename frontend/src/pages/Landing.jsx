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
              Track progress, validate skills, and keep developers accountable —
              all in one place.
            </p>
          </div>
          <Link
            to="#about"
            className="absolute bottom-8 text-lg text-green hover:underline hover:text-khaki transition flex flex-col items-center"
          >
            <span className="mb-4">Learn How DevCheck Works</span>
            <ArrowDown className="items-center animate-bounce"></ArrowDown>
          </Link>
        </section>

        <section
          id="about"
          className="bg-dark min-h-screen flex relative justify-center items-center"
        >
          <div className="flex flex-col items-center text-center justify-center">
            <div className="mb-10 justify-center items-center">
              <h3 className="text-white font-bold md:text-2xl">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. With
                DevCheck, this isn't a dream,{" "}
                <i className="text-blue">it's reality.</i>
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-9 max-w-7xl mb-15">
              <div className="bg-green p-5 text-white text-xl font-semibold text-center rounded-lg hover:scale-102 shadow-lg">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Placeat
                necessitatibus exercitationem obcaecati quasi iure blanditiis
                dolorum consequuntur recusandae! Dicta, accusantium quidem
                perferendis quasi enim impedit.
              </div>
              <div className="bg-beige p-5 text-dark text-xl font-semibold text-center rounded-lg hover:scale-102 shadow-lg">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Placeat
                necessitatibus exercitationem obcaecati quasi iure blanditiis
                dolorum consequuntur recusandae! Dicta, accusantium quidem
                perferendis quasi enim impedit.
              </div>
              <div className="bg-blue p-5 text-dark text-xl font-semibold text-center rounded-lg hover:scale-102 shadow-lg">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Placeat
                necessitatibus exercitationem obcaecati quasi iure blanditiis
                dolorum consequuntur recusandae! Dicta, accusantium quidem
                perferendis quasi enim impedit.
              </div>
            </div>

            <div className="justify-center items-center max-w-3xl">
              <span className="text-white/90">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit.
                Accusantium, nihil! Magni, voluptatum commodi dicta ea explicabo
                libero numquam rerum, reprehenderit quia iusto deleniti delectus
                deserunt. Vitae, minima. Incidunt ad,{" "}
                <b>commodi voluptatibus</b> eveniet consectetur error officia
                accusantium dolore et adipisci <b>temporibus</b> aut beatae enim
                veniam fugiat animi, nesciunt quam quisquam atque!
              </span>
            </div>

            <div className="justify-center items-center absolute bottom-8">
              {!loggedIn ? (
                <span className="text-white/30 italic font-semibold">
                  Like what you see?{" "}
                  <a
                    href="/register"
                    className="mx-2 text-2xl font-bold text-green underline hover:text-khaki"
                  >
                    Register
                  </a>
                  here!
                </span>
              ) : (
                <span className="text-white/30 italic font-semibold">
                  Back to the{" "}
                  <a
                    href="/dashboard"
                    className="mx-2 text-2xl font-bold text-green underline hover:text-khaki"
                  >
                    Dashboard
                  </a>{" "}
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
