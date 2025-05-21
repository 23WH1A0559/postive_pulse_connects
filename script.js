//frontend
document.addEventListener("DOMContentLoaded", () => {
    // === Registration Form Logic ===
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        const userTypeSelect = document.getElementById('userType');
        const affiliatedCompanyGroup = document.getElementById('affiliatedCompanyGroup');
        const affiliatedCompanyInput = document.getElementById('affiliatedCompany');

        // Event listener to show/hide affiliated company field
        userTypeSelect.addEventListener('change', () => {
            if (userTypeSelect.value === 'startup') {
                affiliatedCompanyGroup.style.display = 'block';
                affiliatedCompanyInput.setAttribute('required', 'required');
            } else {
                affiliatedCompanyGroup.style.display = 'none';
                affiliatedCompanyInput.removeAttribute('required');
                affiliatedCompanyInput.value = ''; // Clear value if not startup
            }
        });

        registerForm.addEventListener("submit", async function(event) {
            event.preventDefault();

            const username = document.getElementById("username").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm-password").value;
            const gender = document.getElementById("gender").value;
            const userType = userTypeSelect.value;
            const affiliatedCompany = affiliatedCompanyInput.value; // Get this value

            if (password !== confirmPassword) {
                alert("Passwords do not match. Please try again!");
                return;
            }

            // Construct payload based on user type
            const payload = { username, email, password, gender, userType };
            if (userType === 'startup') {
                payload.affiliatedCompany = affiliatedCompany;
            }

            try {
                const response = await fetch("http://localhost:3001/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload), // Send the constructed payload
                });

                if (response.ok) {
                    alert(`Registration Successful!\nWelcome, ${username}! Please log in.`);
                    window.location.href = "login.html"; // Redirect to login page
                } else if (response.status === 409) {
                    const errorText = await response.text();
                    alert(`Registration Failed: ${errorText}`); // Show specific error message
                    // alert("User already exists! Please log in.");
                    // window.location.href = "login.html"; // Redirect to login page
                } else {
                    const errorText = await response.text();
                    alert(`Failed to register: ${errorText}`);
                }
            } catch (error) {
                console.error("Error during registration:", error);
                alert("An error occurred during registration. Please try again!");
            }
        });
    }

    // === Login Form Logic ===
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

                    // Store all relevant user data in localStorage
                    localStorage.setItem('userEmail', data.email);
                    localStorage.setItem('username', data.username); // Store username for display
                    localStorage.setItem('userType', data.user_type); // Store userType

                    if (data.affiliated_company) {
                        localStorage.setItem('affiliatedCompany', data.affiliated_company);
                    } else {
                        localStorage.removeItem('affiliatedCompany'); // Ensure it's clear if not a startup
                    }

                    // Redirect to business.html or your main application page
                    window.location.href = "business.html";
                } else {
                    const errorText = await response.text(); // Get specific error message from backend
                    alert(`Login Failed: ${errorText}`);
                }
            } catch (error) {
                console.error("Error during login:", error);
                alert("An error occurred during login. Please try again!");
            }
        });
    }

    // No other script.js specific logic for other pages is provided in your snippet,
    // so assume this is primarily for login/register.
    // If you have logic for business.html, it would go into a separate script
    // or this script would be linked to business.html as well and handle
    // the specific DOM elements and events for that page.
});
