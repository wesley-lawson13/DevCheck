import Form from "../components/Form";
import LandingHeader from "../components/LandingHeader";

function Login() {
  return (
    <>
      <LandingHeader loggedIn={false} />
      <div className="bg-dark min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl text-white font-bold mb-10">Login</h1>
        <Form route="checklists/token/" method="login" />
      </div>
    </>
  );
}

export default Login;
