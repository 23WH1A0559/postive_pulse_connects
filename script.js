document.addEventListener("DOMContentLoaded", () => {
    // Handle Registration Form Submission
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            const username = document.getElementById("username").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm-password").value;
            const gender = document.getElementById("gender").value;
            const userType = document.getElementById("userType").value;

            if (password !== confirmPassword) {
                alert("Passwords do not match. Please try again!");
                return;
            }

            try {
                const response = await fetch("http://localhost:3001/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password, gender, userType }),
                });

                if (response.ok) {
                    alert(`Registration Successful!\nWelcome, ${username}! Please log in.`);
                    window.location.href = "login.html"; // Redirect to login page
                } else if (response.status === 409) {
                    // Handle "user already exists" response (409 Conflict status)
                    alert("User already exists! Please log in.");
                    window.location.href = "login.html"; // Redirect to login page
                } else {
                    alert("Failed to register. Please try again!");
                }
            } catch (error) {
                console.error("Error:", error);
                alert("An error occurred. Please try again!");
            }
        });
    }

    // Handle Login
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                const response = await fetch("http://localhost:3001/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                if (response.ok) {
                    const data = await response.json();
                    alert(`Welcome, ${data.username}!`);
                    // Store the user's email in localStorage
                    localStorage.setItem('userEmail', email);
                    window.location.href = "business.html"; // Redirect to business.html
                } else {
                    alert("Invalid email or password. Please try again!");
                }
            } catch (error) {
                console.error("Error during login:", error);
                alert("An error occurred. Please try again!");
            }
        });
    }
});