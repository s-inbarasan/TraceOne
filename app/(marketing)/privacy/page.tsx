import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </Button>

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Trace One Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: August 2026</p>
        </div>

        <div className="space-y-6 text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground mt-8">1. Information We Collect</h2>
          <p>
            Trace One collects information necessary to provide our AI observability and resolution platform. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-foreground">Account Information:</strong> Email address, GitHub profile data, and authentication credentials.</li>
            <li><strong className="text-foreground">GitHub Connection and Repository Data:</strong> Authorized repository metadata, source code structure, commit history, pull requests, and logs analyzed by our platform to generate code patches.</li>
            <li><strong className="text-foreground">Usage Data:</strong> Telemetry about how you interact with our features, including incident investigations and AI chat interactions.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. How We Use Your Information</h2>
          <p>
            The information we collect is used strictly for the purpose of operating and improving the Trace One platform:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide root cause analysis, error diagnostics, and patch generation via AI models.</li>
            <li>To authenticate users and authorize secure access to repositories.</li>
            <li>To communicate with you regarding service updates, security alerts, and support.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. AI Provider and API Usage</h2>
          <p>
            We integrate with third-party Large Language Model (LLM) providers (e.g., Google, OpenAI, Anthropic, NVIDIA, Groq). When you analyze an incident, relevant code snippets and logs are transmitted to the provider you select or configure. We do not use your private repository data to train our own models, and we configure our integrations to request that providers do not use your data for training.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. Third-Party Services</h2>
          <p>
            Our Service integrates with external platforms like GitHub and other third-party services. We are not responsible for the privacy practices or terms of these external providers, and we encourage you to review their respective privacy policies.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Cookies and Local Storage</h2>
          <p>
            We use cookies and local storage to preserve session state, maintain authentication, and store preferences (such as your sidebar collapse state or selected AI models). You can control the use of cookies at the individual browser level.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">6. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data both in transit and at rest. Access to repositories is requested with the minimum necessary permissions, and you can revoke access at any time via your GitHub account settings.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">7. Data Retention</h2>
          <p>
            We retain your information as long as your account is active or as needed to provide you with the Service. You can delete your Trace One account and associated data at any time, which initiates the deletion of your user profile and stored GitHub integration tokens from our active databases.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">8. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data. You can delete your Trace One account and associated data through the application settings or by contacting support.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">9. Contact Information</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at s.inbarasan.zv@gmail.com.
          </p>
        </div>
      </div>
    </div>
  );
}
