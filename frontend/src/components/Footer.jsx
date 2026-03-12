import { Building, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import WhatsappIcon from "@/assets/whatsapp.svg";
import InstagramIcon from "@/assets/instagram.svg";
import FacebookIcon from "@/assets/facebook.svg";


export default function Footer() {
  return (
    <footer className="bg-black text-primary-foreground py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* For More Information Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-4">For more information</h3>
              <h4 className="text-lg font-semibold mb-4">Contact Us:</h4>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">

              {/* Name */}
              <div className="flex items-start gap-3">
                <div className="text-white mt-1">
                  <Building size={20} />
                </div>
                <div>
                  <p className="text-white">British School Gurukul</p>
                </div>
              </div>

              {/* Mail */}
              <div className="flex items-start gap-3">
                <div className="text-white mt-1">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-white">
                    <a href="mailto:contact@bsgurukul.com">contact@bsgurukul.com</a>
                  </p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="text-white mt-1">
                  <MapPin size={20} />
                </div>
                <div>
                  <a
                    href="https://maps.app.goo.gl/2aaWiomCspsrVRkK7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:underline"
                  >
                    Near Gandhi Maidan, Beside Chopra Agencies, Gaya (Bihar)
                  </a>
                </div>
              </div>

              {/* Pin Code */}
              <div className="flex items-start gap-3">
                <div className="text-white mt-1">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-white">PIN - 823001</p>
                </div>
              </div>

              {/* Mobile Number */}
              <div className="flex items-start gap-3">
                <div className="text-white mt-1">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-white">7766994006, 7766994020</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Section */}
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold mb-6">Follow Us</h4>
            </div>

            <div className="flex gap-6">

              {/* Facebook */}
              <Link
                to="https://www.facebook.com/bes.gaya"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-12 h-12 bg-white text-accent-foreground rounded-full hover:opacity-80 transition-opacity"
                aria-label="WhatsApp"
              >
                <img src={FacebookIcon} alt="Facebook" className="w-8 h-8" />
              </Link>

              {/* Instagram */}
              <Link
                to="https://www.instagram.com/bes.gaya"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-12 h-12 bg-white text-accent-foreground rounded-full hover:opacity-80 transition-opacity"
                aria-label="WhatsApp"
              >
                <img src={InstagramIcon} alt="Instagram" className="w-8 h-8" />
              </Link>

              {/* WhatsApp */}
              <Link
                to="https://wa.me/7766994020/?text=I%27m%20interested%20in%20SBTSE"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-12 h-12 bg-white text-accent-foreground rounded-full hover:opacity-80 transition-opacity"
                aria-label="WhatsApp"
              >
                <img src={WhatsappIcon} alt="WhatsApp" className="w-8 h-8" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-primary-foreground/80">
          <p>&copy; 2025 All rights reserved.</p>
          <Link to="/admin/login" className="text-sm hover:text-white mt-2 md:mt-0 opacity-70 hover:opacity-100 transition-opacity">
            Admin Login
          </Link>
        </div>

        {/* Developer Credit */}
        <div className="text-center text-xs text-primary-foreground/60 mt-4">
          <p>
            This website is developed and managed by{" "}
            <a
              href="https://eternalspce.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline decoration-dotted"
            >
              Harshit Raj
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
