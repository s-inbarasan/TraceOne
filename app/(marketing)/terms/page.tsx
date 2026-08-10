import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-extrabold tracking-tight">Trace One Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: August 2026</p>
        </div>

        <div className="space-y-6 text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Trace One platform ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you do not have permission to access the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. The Trace One Service</h2>
          <p>
            Trace One provides an AI-powered observability and resolution platform that analyzes API logs, investigates incident root causes, and generates pull requests to patch identified issues in connected software repositories.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. User Accounts</h2>
          <p>
            You must register for an account to use the Service. You are entirely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. GitHub Integration and Repository Access</h2>
          <p>
            To use key features of the Service, you must connect and authorize Trace One to access your GitHub account. You grant Trace One permission to access and read repository metadata, files, and commit logs, and to write branches and pull requests to your authorized repositories solely for providing the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. AI-Generated Analysis and Code Patches</h2>
          <p>
            The Service utilizes artificial intelligence to analyze logs and generate code patches. <strong className="text-foreground">AI can make mistakes and hallucinate code.</strong> You are entirely responsible for reviewing, testing, compiling, and verifying any AI-generated patches or analysis before merging or deploying them into any environment. Trace One does not guarantee the accuracy, safety, or functionality of AI-generated suggestions.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">6. Pull Request Functionality</h2>
          <p>
            The Service allows you to automatically create pull requests on GitHub containing AI-generated code patches. These pull requests are created under your GitHub identity, and you remain responsible for any actions, builds, or deployments triggered by these pull requests.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">7. Third-Party Services</h2>
          <p>
            The Service integrates with third-party platforms such as GitHub and various Large Language Model (LLM) providers. Your use of these third-party services is subject to their respective terms and privacy policies. Trace One is not responsible for the performance, reliability, or availability of third-party providers.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">8. Prohibited Use</h2>
          <p>
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Analyze repositories or logs that you do not have legal authorization to access.</li>
            <li>Submit malicious code, malware, or seek to exploit vulnerabilities in connected systems.</li>
            <li>In any manner that violates applicable local, state, national, or international law.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">9. Intellectual Property</h2>
          <p>
            You retain all rights, title, and interest in and to the source code and logs you connect to the Service. The Trace One platform, including its original content, features, and functionality, are owned by Trace One and are protected by international copyright and intellectual property laws.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">10. Service Availability</h2>
          <p>
            We strive to maintain continuous availability of our Service. However, we do not guarantee uninterrupted access or that the Service will be free of bugs or errors. We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) with or without notice.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Trace One and its officers, directors, employees, or agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation loss of profits, data, use, goodwill, or other intangible losses, resulting from: (i) your access to or use of (or inability to access or use) the Service; (ii) any code patches or pull requests generated by the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">12. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach these Terms.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">13. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will indicate the date of the latest update at the top of this page. Your continued use of the Service after any changes constitutes acceptance of the new Terms.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">14. Contact Information</h2>
          <p>
            For any questions about these Terms, please contact us at s.inbarasan.zv@gmail.com.
          </p>
        </div>
      </div>
    </div>
  );
}
