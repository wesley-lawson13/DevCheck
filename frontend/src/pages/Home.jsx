import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function Home() {
    const [projects, setProjects] = useState([]);
    const [user, setUser] = useState(null);
    const [showAllProjects, setShowAllProjects] = useState(false);
    const [projectTasks, setProjectTasks] = useState({}); // New state to store tasks by project ID

    useEffect(() => {
        getProjects();
    }, [])

    useEffect(() => {
        fetchUser();
    }, [])

    // Fetch project details whenever projects change
    useEffect(() => {
        if (projects.length > 0) {
            fetchAllProjectDetails();
        }
    }, [projects])

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

    const getProjectDetail = async (projectId) => {
        try {
            const res = await api.get(`/checklists/projects/${projectId}/detail/?dashboard=true`)

            if (res.status === 200 || res.status === 201) {
                console.log(`Project detail for ${projectId}:`, res.data);
                return res.data;
            }
            return null;
        } catch (err) {
            console.error(`Error fetching project detail for ${projectId}:`, err);
            return null;
        }
    }

    // New function to fetch details for all projects and count tasks
    const fetchAllProjectDetails = async () => {
        const tasksMap = {};
        
        for (const project of projects) {
            const detail = await getProjectDetail(project.id);
            
            if (detail) {
                // Count all tasks across all pages and sections
                let taskCount = 0;
                let completedCount = 0;
                
                if (detail.pages) {
                    detail.pages.forEach(page => {
                        if (page.sections) {
                            page.sections.forEach(section => {
                                if (section.tasks) {
                                    taskCount += section.tasks.length

                                    const completedTasks = section.tasks.filter(task => task.completed === true)
                                    completedCount += completedTasks.length;
                                }
                            });
                        }
                    });
                }
                
                console.log(`Project "${project.name}" (ID: ${project.id}): ${taskCount} total tasks, ${completedCount} completed`);
                tasksMap[project.id] = { completed: completedCount, total: taskCount, detail };
            } else {
                tasksMap[project.id] = { completed: 0, count: 0, detail: null };
            }
        }
        
        console.log("Final tasksMap:", tasksMap);
        setProjectTasks(tasksMap);
    }

    const getTopThreeRecentlyEdited = (projects) => {
        if (!projects) return [];

        return [...projects]      
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 3);
    };

    const sortedProjects = (projects) => {
        return [...projects]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        ); 
    };

    const expandProjectsSection = async () => {
        if (showAllProjects) {
            setShowAllProjects(false);
        } else {
            setShowAllProjects(true);
        }
    }

    const recentProjects = getTopThreeRecentlyEdited(projects);
    const allProjects = sortedProjects(projects);

    const bgColors = {
        "MVP": "bg-green",
        "In Development": "bg-beige",
        "In Deployment": "bg-blue",
    };

    const txtColors = {
        "MVP": "text-green",
        "In Development": "text-beige",
        "In Deployment": "text-blue",
    };

    return (
    <div className="px-8 text-white">
      
      <h1 className="text-2xl font-medium mb-6">Welcome, <span className="font-bold">{user?.username}!</span></h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <div className="p-4 border-4 border-green bg-green rounded-lg hover:shadow-lg hover:scale-101 transition">
                <div className="flex justify-center mb-2">
                    <h2 className="text-white font-medium text-2xl">
                        Project in MVP Stage:
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
        
      
      <h1 className="text-2xl font-bold mb-6">Your Projects:</h1>

        <div id="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-4">
                {!showAllProjects ? (
                    recentProjects.map((project, key) => (
                        <Link  
                            to={`projects/${project.id}`}
                            key={key}
                            className="block bg-white border-muted shadow-lg rounded-xl hover:scale-[1.02] hover:shadow-xl transition-transform duration-200"
                        >
                            <div className="h-48 overflow-hidden rounded-xl mx-auto mb-5">
                                <img src={project.image} alt={project.name} />
                            </div>
                            <div className="mx-2 text-center text-xl">
                                <h5 className="text-dark font-bold mb-2">{project.name}</h5>
                                <p className="text-dark font-light text-sm mb-3">{project.description}</p>
                            </div>
                            <hr className="m-4 text-dark/20" />
                            <div className="m-2 flex text-center mb-5 justify-between items-center gap-auto">
                                    <span 
                                        className={`text-white p-2 font-bold text-md ${bgColors[project.project_status]} rounded-xl`}
                                    >
                                        {project.project_status}
                                    </span>
                                {projectTasks[project.id]?.total > 0 ? (
                                    <span 
                                        className={`font-bold text-md ${txtColors[project.project_status]} mx-2 self-center`}
                                    >
                                        {projectTasks[project.id]?.completed} / {projectTasks[project.id]?.total} <span className="text-sm italic">completed.</span>
                                    </span>
                                ) : (
                                   <span 
                                        className={`font-bold text-md ${txtColors[project.project_status]} mx-2 self-center italic`}
                                    >
                                        No tasks yet
                                    </span> 
                                )}
                                
                            </div>
                        </Link>
                    ))
                ) : (
                    allProjects.map((project, key) => (
                        <Link  
                            to={`projects/${project.id}`}
                            key={key}
                            className="block bg-white border-muted shadow-lg rounded-xl hover:scale-[1.02] hover:shadow-xl transition-transform duration-200"
                        >
                            <div className="h-48 overflow-hidden rounded-xl mx-auto mb-5">
                                <img src={project.image} alt={project.name} />
                            </div>
                            <div className="mx-2 text-center text-xl">
                                <h5 className="text-dark font-bold mb-2 align-self-center">{project.name}</h5>
                                <p className="text-dark font-light text-sm mb-3">{project.description}</p>
                            </div>
                            <hr className="m-4 text-dark/20" />
                            <div className="m-2 flex text-center mb-5 justify-between items-center gap-auto">
                                    <span 
                                        className={`text-white p-2 font-bold text-md ${bgColors[project.project_status]} rounded-xl`}
                                    >
                                        {project.project_status}
                                    </span>
                                {projectTasks[project.id]?.total > 0 ? (
                                    <span 
                                        className={`font-bold text-md ${txtColors[project.project_status]} mx-2 self-center`}
                                    >
                                        {projectTasks[project.id]?.completed} / {projectTasks[project.id]?.total} <span className="text-sm italic">completed.</span>
                                    </span>
                                ) : (
                                   <span 
                                        className={`font-bold text-md ${txtColors[project.project_status]} mx-2 self-center italic`}
                                    >
                                        No tasks yet
                                    </span> 
                                )} 
                            </div>
                                
                        </Link>
                    ))
                )}
            </div>
            <div className="flex justify-end items-center p-2 mb-2">
                {(projects.length > 3 && !showAllProjects)  ? (
                    <button
                        className="text-dark font-bold text-md hover:underline"
                        onClick={expandProjectsSection}
                    >
                        View All Projects
                    </button>    
                ) : (
                    <button
                        className="text-dark font-bold text-md hover:underline"
                        onClick={expandProjectsSection}
                    >
                        Minimize
                    </button>
                )}
                
            </div>
        </div>

        {/* Extend after MVP is deployed.

        <hr className="text-dark/20 mb-5"/>

        <div id="statistics">
            <h2 className="text-dark text-2xl font-bold mb-6">User Statistics:</h2>
            <p className="text-dark">Do this!</p>
        </ div>
        
        */}

        <hr className="text-dark/20 mb-5"/>

        <div id="profile">
            <h2 className="text-dark text-2xl font-bold mb-6">Profile:</h2>
            <p className="text-dark">Do this!</p>
        </ div>

    </div>
  );
}

export default Home