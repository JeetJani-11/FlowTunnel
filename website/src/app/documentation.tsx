import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 h-full">
      {/* Sidebar */}
      <div className="col-span-1 hidden lg:block border-r px-4 py-12 overflow-y-auto h-full sticky top-0">
        <nav className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-black">
              Getting Started
            </h2>
            <ul className="mt-2 space-y-2 text-sm">
              {[
                ["Installation", "#installation"],
                ["Authentication", "#authentication"],
                ["Creating Tunnels", "#creating-tunnels"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block pl-2 border-l-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 text-black-600 dark:text-black-400 hover:text-black-900 dark:hover:text-black-100 transition"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-black">
              Reference
            </h2>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link
                  href="#cli-commands"
                  className="block pl-2 border-l-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 text-black-600 dark:text-black-400 hover:text-black-900 dark:hover:text-black-100 transition"
                >
                  CLI Commands
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="col-span-3 overflow-y-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 h-full">
        <section id="installation">
          <h1 className="text-3xl font-bold text-black-900 dark:text-black-50">
            Documentation
          </h1>
          <p className="mt-2 text-black-600 dark:text-black-400">
            Learn how to use TunnelPro to expose your local services
          </p>
        </section>

        <section id="installation" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-black-800 dark:text-black-100">
            Installation
          </h2>
          <p className="mt-4 text-black dark:text-black-300">
            TunnelPro CLI is available for Windows only. Download the
            appropriate version for your operating system.
          </p>
          <div className="mt-6">
            <h3 className="text-lg font-medium text-black-800 dark:text-black-100">
              Download the executable
            </h3>
            <Button className="mt-4">
              <Download className="mr-2 h-4 w-4" />
              Download for Windows
            </Button>
          </div>
        </section>

        <section id="authentication" className="pt-4 scroll-mt-24">
          <h2 className="text-2xl font-bold text-black-800 dark:text-black-100">
            Authentication
          </h2>
          <p className="mt-4 text-black dark:text-black-300">
            Before using TunnelPro, you need to authenticate with your API key.
            You can find your API key in your dashboard.
          </p>
          <pre className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
            <code className="text-white dark:text-white">
              tunnelpro login YOUR_API_KEY
            </code>
          </pre>
          <p className="mt-2 text-black dark:text-black-300">
            This will store your API key securely on your machine. You only need
            to do this once.
          </p>
        </section>

        <section id="creating-tunnels" className="pt-4 scroll-mt-24">
          <h2 className="text-2xl font-bold text-black-800 dark:text-black-100">
            Creating Tunnels
          </h2>
          <p className="mt-4 text-black dark:text-black-300">
            To create a tunnel to a local service, use the{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-white">
              connect
            </code>{" "}
            command followed by the port number.
          </p>
          <pre className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
            <code className="text-white dark:text-white">
              tunnelpro connect 8080
            </code>
          </pre>
          <p className="mt-2 text-black dark:text-black-300">
            This will create a tunnel to your local service running on port 8080
            and provide you with a public URL.
          </p>
          <div className="mt-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h4 className="font-medium text-black-800 dark:text-black">
              Example output:
            </h4>
            <pre className="mt-2 text-sm text-white dark:text-white">
              {`Tunnel created!
Your service is now available at: https://ab12cd.tunnelpro.io
Forwarding https://ab12cd.tunnelpro.io -> localhost:8080

Press Ctrl+C to stop the tunnel`}
            </pre>
          </div>
        </section>

        <section id="cli-commands" className="pt-4 scroll-mt-24">
          <h2 className="text-2xl font-bold text-black-800 dark:text-black-100">
            CLI Commands
          </h2>
          <p className="mt-4 text-black dark:text-black-300">
            TunnelPro CLI provides several commands to manage your tunnels.
          </p>

          <div className="mt-6 space-y-8">
            {[
              ["login", "Authenticate with your API key."],
              ["connect", "Create a tunnel to a local port."],
            ].map(([cmd, desc]) => (
              <div key={cmd}>
                <h3 className="text-lg font-medium text-black-800 dark:text-black-100">
                  {cmd}
                </h3>
                <p className="mt-1 text-sm text-black-600 dark:text-black-400">
                  {desc}
                </p>
                <pre className="mt-2 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                  <code className="text-white dark:text-white">{`tunnelpro ${cmd} ${
                    cmd === "connect" ? "PORT" : "YOUR_API_KEY"
                  }`}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
