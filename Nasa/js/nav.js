// 1. Get all navigation buttons
const navButtons = document.querySelectorAll(".nav-button");

// 2. Get all website pages
const pages = document.querySelectorAll(".page");

// 3. Add a click event to every button
navButtons.forEach(button => {

    button.addEventListener("click", () => {

        // 4. Find which page was selected
        const selectedPage = button.dataset.page;

        // 5. Hide all pages
        pages.forEach(page => {
            page.hidden = true;
        });

        // 6. Show the selected page
        document.getElementById(selectedPage).hidden = false;

        // 7. Remove active style from all buttons
        navButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        // 8. Highlight the selected button
        button.classList.add("active");

    });

});