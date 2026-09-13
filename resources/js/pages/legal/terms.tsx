import { Link } from '@inertiajs/react';
import { PolicyPage } from '@/components/policy-page';

export default function Terms() {
    return (
        <PolicyPage
            title="Terms"
            description="Simple ground rules for using Workbine and sharing useful experience."
        >
            <section>
                <h2>A free community project</h2>
                <p>
                    Workbine is a free community for practical knowledge. There
                    are no subscriptions or payments for using the site. These
                    terms cover workbine.com; they do not govern independently
                    hosted copies of the project.
                </p>
                <p>
                    The source code is available on{' '}
                    <a href="https://github.com/MihaiBarascu/workbine">
                        GitHub
                    </a>
                    . These community terms do not grant a software licence or
                    change any licence supplied with the code.
                </p>
            </section>
            <section>
                <h2>Your account</h2>
                <p>
                    Keep your sign-in details secure and use an email address
                    you control. Do not impersonate others, bypass access
                    controls or use multiple accounts to manufacture support for
                    your contributions. Creating an account means accepting
                    these terms. The <Link href="/privacy">Privacy notice</Link>{' '}
                    describes how information is used.
                </p>
            </section>
            <section>
                <h2>Share responsibly</h2>
                <p>
                    Describe your actual experience, explain context and
                    limitations, and credit sources. Distinguish a method you
                    tried from one you are sharing from another source. Do not
                    present fabricated evidence, income claims or AI-generated
                    accounts as your own lived experience.
                </p>
                <p>
                    Do not post scams, spam, threats, hateful attacks,
                    pornography, graphic abuse, dangerous instructions or
                    someone else’s private information. Only upload material you
                    have permission to share. Our{' '}
                    <Link href="/community/guide">Community guide</Link>{' '}
                    explains the expected contribution style.
                </p>
            </section>
            <section>
                <h2>Your content stays yours</h2>
                <p>
                    You retain your rights in what you publish. You give
                    Workbine a non-exclusive, royalty-free permission to store,
                    display, format and distribute that content as needed to
                    operate the service, including showing previews and
                    delivering it through hosting and storage providers.
                </p>
                <p>
                    Publishing a contribution does not automatically place it
                    under the code repository’s licence. This permission is
                    limited to operating the service and ends for removed
                    content when related copies are removed, except for
                    retention required by law. Other people may already have
                    saved or shared public content.
                </p>
            </section>
            <section>
                <h2>Editing, removal and moderation</h2>
                <p>
                    You can edit your topics. A method becomes preserved after
                    another member tries it. Its original content then stays
                    intact; the author can add dated updates. You can edit or
                    remove your own experiences. Account deletion removes your
                    contributions and can also remove other contributions
                    attached to your topics or methods.
                </p>
                <p>
                    We may hold submissions for review, hide content or restrict
                    accounts to address rule violations, abuse or legal
                    requirements. Automated checks may assist this process. Use
                    the report action where available, or contact{' '}
                    <a href="mailto:hello@workbine.com">hello@workbine.com</a>{' '}
                    to report a concern, request content removal or ask for a
                    human review of a decision. Include the relevant link and
                    enough context to identify the issue.
                </p>
            </section>
            <section>
                <h2>Use your judgement</h2>
                <p>
                    Methods and outcomes are contributed by members and are not
                    independently verified guarantees. A result that worked for
                    one person may not work for you. Content does not replace
                    professional advice where that is needed. External links
                    lead to services with their own rules.
                </p>
                <p>
                    The service is provided as available. Features may change or
                    become unavailable, and we do not guarantee uninterrupted
                    access or particular outcomes. Nothing in these terms
                    excludes rights or responsibilities that applicable law does
                    not allow us to exclude.
                </p>
            </section>
            <section>
                <h2>Changes and contact</h2>
                <p>
                    Updates to these terms will be reflected in the date above.
                    We will provide notice of material changes before they take
                    effect. For questions, contact{' '}
                    <a href="mailto:hello@workbine.com">hello@workbine.com</a>.
                </p>
            </section>
        </PolicyPage>
    );
}
