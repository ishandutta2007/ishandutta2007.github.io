# Ishan's Personal Website and Blog

Welcome to the repository for Ishan's personal website and blog! This site is built using [Zola](https://www.getzola.org/), a fast static site generator written in Rust.

## About

This website serves as a platform for sharing thoughts, projects, and other content. It features a blog, a projects section, and an about page.

## Technologies Used

*   **Zola:** Static Site Generator
*   **HTML5:** Structure
*   **CSS3:** Styling (with custom fonts and a refined color palette)
*   **JavaScript:** Interactive elements (if any)

## Local Development

To run the website locally for development, you need to have Zola installed.

1.  **Install Zola:**
    If you don't have Zola installed, please refer to the [official Zola documentation](https://www.getzola.org/documentation/getting-started/installation/) for installation instructions specific to your operating system. For Windows, you can download the executable from the [releases page](https://github.com/getzola/zola/releases) and place it in your project directory or add it to your system's PATH.

2.  **Start the Development Server:**
    Navigate to the root of this project in your terminal and run:
    ```bash
    zola serve
    ```
    This will start a local server (usually at `http://127.0.0.1:1111`) and automatically rebuild the site and refresh your browser when changes are detected.

## Deployment

This website is automatically deployed to [GitHub Pages](https://ishandutta2007.github.io/) via [GitHub Actions](https://github.com/ishandutta2007/ishandutta2007.github.io/actions).

The deployment process is triggered on every push to the `master` branch:

1.  **Push Changes:** Make your changes, commit them, and push to the `master` branch of this repository.
2.  **GitHub Actions Build:** A GitHub Actions workflow (`.github/workflows/static.yml`) will automatically:
    *   Install Zola.
    *   Build the static site using `zola build`.
    *   Upload the generated `/.dist` directory as an artifact.
3.  **GitHub Pages Deployment:** The artifact is then deployed to GitHub Pages, making your changes live.

## License

This project is licensed under the [MIT License](LICENSE).
