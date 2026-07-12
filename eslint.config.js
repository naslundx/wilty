export default [
    {
        files: ["static/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                console: "readonly",
                alert: "readonly",
                confirm: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                fetch: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "off",
            "no-console": "off",
            "no-undef": "error"
        }
    }
];
