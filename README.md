# DevCheck

**DevCheck** is a full-stack checklist application designed specifically for **web developers**.  
It lets you create and manage project pages, each with its own checklist of development tasks, helping you stay organized during each phase of development from MVP to deployment.

## <!-- Eventually add a picture here -->

## Features

- Create and manage multiple **projects**
- Each project contains **pages**, each with its own checklist of tasks
- **JWT authentication** for secure user access
- **Real-time task updates** with React state management
- Built with a clean and responsive **TailwindCSS** UI
- **Django REST Framework** API backend
- API integration using **Axios**

---

## Tech Stack

**Frontend**

- [React (Vite)](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Axios](https://axios-http.com/)
- [React Router](https://reactrouter.com/)

**Backend**

- [Django](https://www.djangoproject.com/)
- [Django REST Framework (DRF)](https://www.django-rest-framework.org/)
- [SimpleJWT](https://django-rest-framework-simplejwt.readthedocs.io/)

---

## Local Setup

Follow these steps to run DevCheck locally:

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/devcheck.git
cd devcheck
```

### 2. Backend Setup

```bash
cd DevCheck_Backend
python -m venv venv
source venv/bin/activate   # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

#### Configure Environment Variables

Copy the example file and edit it (`DEBUG=True` is required for local development):

```bash
cp .env.example .env
```

#### Apply Database Migrations and Run the Server

```bash
python manage.py migrate
python manage.py runserver
```

Your Django backend should now be running at:
http://127.0.0.1:8000/

#### Load Demo Data (optional)

To fill the dashboard with realistic projects, pages and partly-completed checklists:

```bash
python manage.py seed_demo
```

This creates a `demo` user (password `demo-pass-123`) with four projects across MVP / In Development / In Deployment. Re-running it replaces that user's projects instead of duplicating them. Use `--username` / `--password` to change the login.

### 3. Frontend Setup

```bash
cd ../frontend
cp .env.example .env       # points the app at http://127.0.0.1:8000
npm install
npm run dev
```

Your React frontend should now be running at:
http://127.0.0.1:5173/

### 4. Running the Tests

```bash
# Backend
cd DevCheck_Backend && pip install -r requirements-dev.txt && pytest

# Frontend
cd frontend && npm test -- --run
```

---

## Future Plans

Here are a few of my future plans for this site:

1. Import from Figma feature
2. UI improvements for the checklist
3. Detailed user statistics displayed on the dashboard
