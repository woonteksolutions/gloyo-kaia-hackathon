import { Signup1 } from "@/components/ui/signup-1"

const Demo = () =>{
    return (
        <Signup1
          heading="Welcome to Gloyo"
          logo={{
            url: "https://gloyo.app",
            src: "/gloyo-uploads/gloyo-logo.png",
            alt: "Gloyo",
            title: "Gloyo - Your DeFi Platform"
          }}
          signupText="Get Started"
          googleText="Continue with Google"
        />
    )
}

export {Demo}