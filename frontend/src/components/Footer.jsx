import { Link } from "react-router-dom";
import { LuGithub } from "react-icons/lu";

export default function Footer() {
    return (
        <footer className="bg-white text-dark px-6 py-6 border-t border-khaki/30">
            <div className="flex justify-between mx-auto text-center">
                <p className="text-sm">
                    &copy; {new Date().getFullYear()} Wesley Lawson. All rights reserved.
                </p>
                <div className="flex gap-4">
                    <Link to="/about" className="text-sm hover:underline">
                        About
                    </Link>
                    <Link to="https://github.com/wesley-lawson13/DevCheck" className="text-sm hover:underline">
                        Github
                    </Link>

                </div>
            </div>
        </footer>
    );
};
