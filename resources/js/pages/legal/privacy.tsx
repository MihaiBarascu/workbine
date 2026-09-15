import { Link } from '@inertiajs/react';
import { PolicyPage } from '@/components/policy-page';

export default function Privacy() {
    return (
        <PolicyPage
            title="Privacy"
            description="How Workbine uses information to run the community, and the choices you have."
        >
            <section>
                <h2>About this notice</h2>
                <p>
                    This notice covers workbine.com. For privacy questions or
                    requests, contact{' '}
                    <a href="mailto:hello@workbine.com">hello@workbine.com</a>.
                    Other websites, including independently hosted copies of the
                    project, have their own practices.
                </p>
            </section>
            <section>
                <h2>Information you provide</h2>
                <ul>
                    <li>
                        <strong>Account details:</strong> your email, display
                        name, username and sign-in credentials. Optional public
                        profile details include a photo, biography, location,
                        website, separate contact email and social links.
                    </li>
                    <li>
                        <strong>Contributions:</strong> topics, methods, dated
                        updates, experiences, sources and uploaded images.
                    </li>
                    <li>
                        <strong>Private activity:</strong> saved topics,
                        notifications, content reports and messages you send to
                        our contact address.
                    </li>
                    <li>
                        <strong>Security information:</strong> session
                        information, IP addresses, browser information and
                        records needed to investigate errors or abuse.
                    </li>
                </ul>
            </section>
            <section>
                <h2>What other people can see</h2>
                <p>
                    Your profile, contributions, uploaded contribution images
                    and aggregate impact are public. Any contact email or social
                    links you add to the public-profile section are public too
                    and can be indexed, copied or shared by others. Only publish
                    contact details you are comfortable making public.
                </p>
                <p>
                    Your account email, sign-in credentials, saved-topic list,
                    notifications and reports are not shown on your public
                    profile. The optional public contact email is stored
                    separately from the account email, so changing one does not
                    automatically publish or change the other. Aggregate save
                    counts are public. Information you include yourself in a
                    public contribution is public too.
                </p>
            </section>
            <section>
                <h2>Why we use this information</h2>
                <p>
                    We use account and contribution data to provide the service
                    you request: sign-in, publishing, saved topics,
                    notifications and account recovery. Public profile details
                    are displayed when you choose to add them. Where GDPR
                    applies, this processing is based on performing the service
                    agreement described in our <Link href="/terms">Terms</Link>.
                </p>
                <p>
                    Security, abuse prevention and moderation support our
                    legitimate interests in keeping the community usable and
                    protecting its members. We may also process information to
                    meet applicable legal obligations and respond to privacy
                    requests.
                </p>
            </section>
            <section>
                <h2>Services involved</h2>
                <ul>
                    <li>
                        <strong>Hosting and Cloudflare:</strong> hosting
                        infrastructure processes requests and stores application
                        data. Cloudflare provides network protection and public
                        image storage and delivery. Where a Turnstile check is
                        shown, Cloudflare processes the information needed for
                        that security check.
                    </li>
                    <li>
                        <strong>Google sign-in:</strong> if you choose Google,
                        we receive account identification, your verified email
                        and profile information needed to create or access your
                        account.
                    </li>
                    <li>
                        <strong>Email:</strong> delivery providers process
                        recipients and messages for confirmation and account
                        recovery. Workbine uses Resend for these messages.
                        Correspondence sent to hello@workbine.com is handled
                        through Zoho Mail.
                    </li>
                    <li>
                        <strong>Content checks:</strong> when automated
                        moderation is enabled, public text and processed images
                        may be sent to OpenAI for checking before publication. A
                        flagged submission can be held privately for human
                        review; you can contact us about a decision.
                    </li>
                </ul>
                <p>
                    These services can process information outside your country,
                    including outside the European Economic Area. Their
                    locations and retention depend on the service and its
                    configuration. Contact us for details about the processing
                    and transfer arrangements relevant to your information.
                </p>
            </section>
            <section>
                <h2>Cookies and browser storage</h2>
                <p>
                    Cookies support sessions, sign-in and request security.
                    Browser storage and preference cookies remember appearance,
                    navigation and guide settings. Clearing or blocking them can
                    sign you out or reset your preferences.
                </p>
                <p>
                    Following an external link takes you to a service with its
                    own privacy and cookie practices. Opening the GitHub link
                    does not publish your Workbine account or contributions to
                    the repository.
                </p>
            </section>
            <section>
                <h2>Keeping and removing information</h2>
                <p>
                    Account information is kept while your account is active.
                    Contributions remain available until removed through account
                    deletion or moderation. You can remove your own experiences
                    and saved topics, and edit or clear the public profile fields
                    available in settings.
                </p>
                <p>
                    Deleting your account in Profile settings removes your
                    profile and contributions from the application. Deleting a
                    topic or method also removes dependent contributions. Image
                    deletion is attempted during cleanup, with failed deletions
                    retained for retry. Copies already cached or downloaded
                    elsewhere may remain available.
                </p>
                <p>
                    Held moderation records become eligible for cleanup after 30
                    days. Logs, security records, contact correspondence and any
                    backup copies follow separate operational or provider
                    retention arrangements; deleting an account does not
                    guarantee immediate removal from every such system. Contact
                    us for a request concerning those records.
                </p>
            </section>
            <section>
                <h2>Your choices and rights</h2>
                <p>
                    You can browse without an account, choose which optional
                    profile details to share and delete your account through
                    settings. For access to your information, a copy,
                    correction, erasure, restriction or an objection to
                    processing, email{' '}
                    <a href="mailto:hello@workbine.com">hello@workbine.com</a>.
                    These rights apply subject to the conditions in the
                    applicable law. We may need to verify that a request
                    concerns your account.
                </p>
                <p>
                    Where processing relies on consent, you can withdraw it. You
                    may also complain to your local data protection authority.
                    See the{' '}
                    <a href="https://www.edpb.europa.eu/about-edpb/about-edpb/members_en">
                        European data protection authorities
                    </a>
                    .
                </p>
            </section>
            <section>
                <h2>Changes</h2>
                <p>
                    We will update this page when the practices described here
                    change and update the date above. If a change requires
                    additional notice or a choice from you, we will provide it
                    before applying that change.
                </p>
            </section>
        </PolicyPage>
    );
}
