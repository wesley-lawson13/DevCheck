import { useState, useEffect } from "react";
import api from "../api";

function Home() {
    const [projects, setProjects] = useState([]);
    const [name, setName] = useState("");
    const [description, getDescription] = useState("");
    const [link, getLink] = useState("");

    useEffect(() => {
        getProjects();
    }, [])

    const getProjects = () => {
        api.get("/checklists/projects/")
            .then((res) => res.data)
            .then((data) => { setProjects(data); console.log(data)})
            .catch((err) => alert(err))
    }

    const deleteProject = (id) => {
        api.delete(`/checklists/projects/delete/${id}/`).then((res) => {
            if (res.status === 204) alert("Project deleted!") 
            else alert("Failed to delete project")
        }).catch((error) => alert(error));
        getProjects();
    }

    const createProject = (e) => {
        e.preventDefault()
        api.post("/checklists/projects/", {name, description, link}).then((res) => {
            if (res.status === 201) alert("Project created successfully!")
            else alert("Failed to create project")
        }).catch((error) => alert(error))
        getProjects()
    }

    return <section id="home">

    </section>
}

export default Home