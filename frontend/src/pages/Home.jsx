import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function Home() {
    const [projects, setProjects] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [link, setLink] = useState("");

    useEffect(() => {
        getProjects();
    }, [])

    const getProjects = () => {
        api.get("/checklists/projects/")
            .then((res) => res.data)
            .then((data) => { setProjects(data); console.log(data)})
            .catch((err) => alert(err))
    }

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
      <h1 className="text-2xl font-bold mb-6">Your Projects</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {projects.map((project, key) => (
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

    </div>
  );
}

export default Home