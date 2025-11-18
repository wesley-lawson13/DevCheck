import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function Home() {
    const [projects, setProjects] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [link, setLink] = useState("");
    const [user, setUser] = useState(null);

    useEffect(() => {
        getProjects();
    }, [])

    useEffect(() => {
        fetchUser();
    }, [])

    const fetchUser = async () => {
        try {
            const res = await api.get("/checklists/user/");
            if (res.status === 200 || res.status === 201) {
                setUser(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch user", err);   
        }
    };

    const getProjects = () => {
        api.get("/checklists/projects/")
            .then((res) => res.data)
            .then((data) => { setProjects(data); console.log(data)})
            .catch((err) => alert(err))
    }

    const getTopThreeRecentlyEdited = (projects) => {
        if (!projects) return [];

        return [...projects]      
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);
    };

    const recentProjects = getTopThreeRecentlyEdited(projects);

    const createProject = (e) => {
        e.preventDefault()
        api.post("/checklists/projects/", {name, description, link}).then((res) => {
            if (res.status === 201) alert("Project created successfully!")
            else alert("Failed to create project")
        }).catch((error) => alert(error))
        getProjects()
    }

    return (
    <div className="px-8 text-white">
      
      <h1 className="text-2xl font-medium mb-6">Welcome, <span className="font-bold">{user?.username}!</span></h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <div className="p-4 border-4 border-green bg-green rounded-lg hover:shadow-lg hover:scale-101 transition">
                <div className="flex justify-center mb-2">
                    <h2 className="text-white font-medium text-2xl">
                        Projects in MVP Stage:
                    </h2>
                </div>
                <div className="flex justify-center">
                    <h2 className="text-white font-bold text-6xl justify-self-center">
                        {projects.filter(project => project.project_status === "MVP").length}
                    </h2>
                </div>
                
                
                
            </div>
            <div className="p-4 border-4 border-beige bg-beige rounded-lg hover:shadow-lg hover:scale-101 transition">
                <div className="flex justify-center mb-2">
                    <h2 className="text-dark font-medium text-2xl">
                        Projects in Development:
                    </h2>
                </div>
                <div className="flex justify-center">
                    <h2 className="text-dark font-bold text-6xl justify-self-center">
                        {projects.filter(project => project.project_status === "In Development").length}
                    </h2>
                </div>
                
                
                
            </div>
            <div className="p-4 border-4 border-blue bg-blue rounded-lg hover:shadow-lg hover:scale-101 transition">
                <div className="flex justify-center mb-2">
                    <h2 className="text-dark font-medium text-2xl">
                        Projects in Deployment:
                    </h2>
                </div>
                <div className="flex justify-center">
                    <h2 className="text-dark font-bold text-6xl justify-self-center">
                        {projects.filter(project => project.project_status === "In Deployment").length}
                    </h2>
                </div>
                
            </div>
        </div>
        
      
      <h1 className="text-2xl font-bold mb-6">Recent Projects</h1>

        <div id="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-4">
                {recentProjects.map((project, key) => (
                    <Link  
                        to={`projects/${project.id}`}
                        key={key}
                        className="block bg-white border-muted shadow-lg rounded-xl hover:scale-[1.02] hover:shadow-xl transition-transform duration-200"
                    >
                        <div className="h-48 overflow-hidden rounded-xl mx-auto mb-5">
                            <img src={project.image} alt={project.name} />
                        </div>
                        <div className="mx-2 text-center text-xl mb-5">
                            <h5 className="text-dark font-bold mb-2">{project.name}</h5>
                            <p className="text-dark font-light text-sm mb-3">{project.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
            <div className="flex justify-end items-center p-2 mb-2">
                {(projects.length > 3) && (
                    <button
                        className="text-dark font-bold text-md hover:underline"
                        //onClick={}
                    >
                        View All Projects
                    </button>    
                )}
                
            </div>
        </div>

        <hr className="text-dark/20 mb-5"/>

        <div id="statistics">
            <h2 className="text-dark text-2xl font-bold mb-6">User Statistics:</h2>
            <p className="text-dark">Do this!</p>
        </ div>

        <hr className="text-dark/20 mb-5"/>

        <div id="profile">
            <h2 className="text-dark text-2xl font-bold mb-6">Profile:</h2>
            <p className="text-dark">Do this!</p>
        </ div>

    </div>
  );
}

export default Home