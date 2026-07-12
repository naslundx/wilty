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
                setTimeout: "readonly",
                clearTimeout: "readonly",
                fetch: "readonly",
                clearSessionAndRedirect: "readonly",
                leaveGame: "readonly",
                endGame: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "error",
            "no-console": "off",
            "no-undef": "error",
            "eqeqeq": "error",
            "curly": "error",
            "no-var": "error",
            "prefer-const": "error"
        }
    }
];
