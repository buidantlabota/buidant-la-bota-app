import * as React from "react"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50"

        let variantStyles = ""
        switch (variant) {
            case "default": variantStyles = "bg-primary text-white hover:bg-primary-dark shadow"; break;
            case "destructive": variantStyles = "bg-red-600 text-white hover:bg-red-700 shadow-sm"; break;
            case "outline": variantStyles = "border border-border bg-white hover:bg-gray-50 text-text-primary shadow-sm"; break;
            case "secondary": variantStyles = "bg-gray-200 text-gray-900 hover:bg-gray-300 shadow-sm"; break;
            case "ghost": variantStyles = "hover:bg-gray-100 text-text-primary"; break;
            case "link": variantStyles = "text-primary underline-offset-4 hover:underline"; break;
            default: variantStyles = "bg-primary text-white hover:bg-primary-dark shadow";
        }

        let sizeStyles = ""
        switch (size) {
            case "default": sizeStyles = "h-10 px-4 py-2"; break;
            case "sm": sizeStyles = "h-9 rounded-md px-3"; break;
            case "lg": sizeStyles = "h-11 rounded-md px-8"; break;
            case "icon": sizeStyles = "h-10 w-10"; break;
            default: sizeStyles = "h-10 px-4 py-2";
        }

        return (
            <button
                className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className || ""}`}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
