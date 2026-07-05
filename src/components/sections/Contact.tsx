import { StakeholderInquiryForm } from "@/components/forms/StakeholderInquiryForm";
import { contact } from "@/lib/content";

export function Contact() {
  return (
    <section className="bg-surface-container-low py-24" id="contact">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 font-[family-name:var(--font-headline)] text-3xl text-primary md:text-4xl">
              Partner With Us
            </h2>
            <p className="mb-8 text-on-surface-variant">
              We are calling on local residents, businesses, and the broader Virgin Islands
              diaspora to back our upcoming initiatives and the construction of the Leadership
              Academy.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-harvest-gold">call</span>
                <div>
                  <p className="font-medium text-primary">Primary Phone</p>
                  <a href={contact.phoneHref} className="text-lg hover:underline">
                    {contact.phone}
                  </a>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-harvest-gold">mail</span>
                <div>
                  <p className="font-medium text-primary">Official Email</p>
                  {contact.emails.map((email) => (
                    <a key={email} href={`mailto:${email}`} className="block text-lg hover:underline">
                      {email}
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-harvest-gold">location_on</span>
                <div>
                  <p className="font-medium text-primary">Base Location</p>
                  <p className="text-lg">{contact.location}</p>
                </div>
              </div>
            </div>
          </div>
          <StakeholderInquiryForm />
        </div>
      </div>
    </section>
  );
}
