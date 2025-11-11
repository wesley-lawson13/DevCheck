# DevCheck

**DevCheck** is a full-stack checklist application designed specifically for **web developers**.  
It lets you create and manage project pages, each with its own checklist of development tasks, helping you stay organized during each phase of development from MVP to deployment.
<!-- Eventually add a picture here -->
---

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
```
#### Install Dependencies
```bash
pip install -r requirements.txt
```
#### Apply Database Migrations
```bash
python manage.py migrate
```
#### Run the Backend Server
```bash
python manage.py runserver
```
Your Django backend should now be running at:
http://127.0.0.1:8000/

### 3. Frontend Setup
```bash
cd ../frontend
```
#### Install Npm Packages
```bash
npm install
```
#### Start the Development Server
```bash
npm run dev
```
Your React frontend should now be running at:
http://127.0.0.1:5173/

### 4. Environment Variables:

#### Frontend (.env)
Create a .env file inside the frontend/ directory with the following:
```bash
VITE_API_URL=http://127.0.0.1:8000
```

---

## Future Plans

Here are a few of my future plans for this site:

1. Deployment to *Render* (backend) and *Vercel* (frontend)
2. Mobile-responsive Improvements
3. Ability to Import a Design from Figma 
