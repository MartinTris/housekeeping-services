import React, { useState } from "react";

const TermsAndConditionsModal = ({ isOpen, onClose, onAccept }) => {
  const [activeTab, setActiveTab] = useState("Hotel Rafael");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="bg-green-900 text-white px-6 py-4">
          <h2 className="text-2xl font-bold font-poppins">
            Terms and Conditions
          </h2>
          <p className="text-sm text-green-100 mt-1">
            Please read and accept to continue with registration
          </p>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === "Hotel Rafael"
                ? "bg-white text-green-900 border-b-4 border-green-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("Hotel Rafael")}
          >
            Hotel Rafael
          </button>

          <button
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === "RCC"
                ? "bg-white text-green-900 border-b-4 border-green-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("RCC")}
          >
            Retreat and Conference Center (RCC)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === "Hotel Rafael" ? (
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-bold text-green-900 mb-3">
                Hotel Rafael: Terms and Conditions
              </h3>

              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p className="mb-4">
                  At De La Salle University–Dasmariñas (DLSU-D), we are
                  committed to safeguarding the privacy of the individuals whom
                  we interact with as we conduct our operations in responding to
                  the needs of the Church and the Nation for human and Christian
                  education, particularly the youth-at-risk. Guided by the
                  Lasallian values of Faith, Zeal, and Communion, DLSU-D
                  respects your right to privacy and strives to comply with the
                  requirements of the Data Privacy Act of 2012, also known as RA
                  10173. This privacy policy outlines how we handle personal
                  data collected directly through our website and through
                  third-party platforms connected to it. The policy applies to
                  the DLSU-D website in general; however, the University
                  reserves the right to modify, amend, or vary this policy at
                  any time, particularly where the need arises for a slightly
                  different privacy framework. In such instances, the University
                  assures full transparency and clarity regarding any deviation
                  from the original policy. As you navigate the website or any
                  of its connected systems, you are encouraged to review the
                  privacy policy periodically for updates or changes applicable
                  to specific areas of the platform.
                </p>

                <p className="mb-4">
                  Hotel Rafael implements strict accommodation and operational
                  guidelines to ensure the safety, comfort, and satisfaction of
                  all guests. By choosing to stay at Hotel Rafael or use its
                  associated digital systems, you agree to abide by the
                  following rules and responsibilities. Upon arrival, guests are
                  required to present and provide a copy of their official
                  receipt as proof of full payment to the front desk. Guests
                  will then be personally guided to their respective rooms by
                  authorized hotel personnel. For security and accountability
                  purposes, room keys must be returned to the front desk every
                  time the guest leaves the hotel premises. Guests are expected
                  to exercise proper care for hotel property and abide by all
                  housekeeping and operational protocols.
                </p>

                <p className="mb-4">
                  Hotel Rafael also implements strict adherence to security,
                  guest privacy, and hotel management procedures. Guests must
                  cooperate with all instructions by hotel staff and security
                  personnel in circumstances involving safety protocols,
                  emergencies, or official hotel procedures. Any form of
                  misconduct, misuse of hotel facilities, or disregard of
                  established guidelines may lead to additional charges,
                  cancellation of stay, removal from the premises, or denial of
                  future accommodations. Guests acknowledge that the enforcement
                  of guidelines is necessary to maintain a safe, orderly, and
                  respectful environment for all occupants.
                </p>

                <p className="mb-4">
                  By registering, the User grants Hotel Rafael and
                  DLSU-Dasmariñas full consent to collect, store, and process
                  their personal data solely for housekeeping, accommodation,
                  operational, and administrative purposes in accordance with
                  the Data Privacy Act of 2012 and all applicable privacy and
                  confidentiality standards. Hotel Rafael shall not disclose any
                  user information to third parties unless required for official
                  operations, legal compliance, safety, or security reasons.
                  Users understand that all information they provide becomes
                  part of Hotel Rafael's official housekeeping, security, and
                  facility management records and may be retained as required
                  for documentation and operational integrity. Proceeding with
                  the registration, accessing the Web-Based System, or
                  continuing to use its features and services, the User affirms
                  that they have fully read, understood, and voluntarily agreed
                  to be bound by these Terms and Conditions. Users understand
                  that declining these Terms and Conditions will prevent the
                  creation of a system account and restrict access to all
                  digital housekeeping and accommodation services provided by
                  Hotel Rafael. Continued use of the System constitutes ongoing
                  acceptance of any updated, amended, or revised Terms and
                  Conditions as implemented by Hotel Rafael.
                </p>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-bold text-green-900 mb-3">
                RCC: Terms and Conditions
              </h3>

              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p className="mb-4">
                  At De La Salle University–Dasmariñas (DLSU-D), we are
                  committed to safeguarding the privacy of the individuals that
                  we interact with as we conduct our operations in responding to
                  the needs of the Church and the Nation for human and Christian
                  education, particularly the youth-at-risk. Guided by the
                  Lasallian values of Faith, Zeal, and Communion, DLSU-D
                  respects your right to privacy and strives to comply with the
                  requirements of the Data Privacy Act of 2012, also known as
                  Republic Act No. 10173. This privacy policy explains how we
                  handle personal data that we collect both directly through our
                  website and through third-party sites connected to it.
                  Although this policy generally applies to the DLSU-D website,
                  the University reserves the right to modify, amend, or vary
                  this policy at any time, especially when specific portions of
                  the website require a slightly different privacy approach. In
                  such cases, the University guarantees full transparency and
                  will clearly communicate any variations from the original
                  privacy policy. As you continue to navigate the website or use
                  any of its connected systems, you are encouraged to regularly
                  review the privacy policy to stay informed of updates or
                  changes.
                </p>

                <p className="mb-4">
                  These Terms and Conditions constitute a legally binding
                  agreement between the user ("Guest/Student," "Client," or
                  "User") and RCC concerning the access to and use of the
                  Web-Based Housekeeping Services System ("the System"). By
                  registering for an account, accessing, or using the System,
                  the User acknowledges and accepts these Terms in full. Users
                  who do not agree with any part of these Terms are strictly
                  prohibited from creating an account or using the System in any
                  capacity. The use of the System is granted solely for the
                  purpose of facilitating housekeeping operations, room
                  accommodation management, service requests, function hall
                  scheduling, and other official activities related to RCC
                  housing and facility administration. Users agree to provide
                  accurate, complete, and truthful information when registering
                  or submitting any request within the System. Misrepresentation
                  of identity, unauthorized access, tampering with system
                  records, or misuse of its functions for any activity unrelated
                  to official RCC housekeeping operations is strictly
                  prohibited. Users are solely responsible for maintaining the
                  confidentiality of their login credentials and for any actions
                  conducted under their account.
                </p>

                <p className="mb-4">
                  All guests and users of the System are required to comply with
                  the RCC General House Rules. Smoking of any kind, including
                  electronic cigarettes and vaporizers, along with the
                  consumption of alcoholic beverages and the use of illegal
                  drugs is strictly forbidden within the premises. The use of
                  plastics, Styrofoam, and other non-eco-friendly disposable
                  materials is not allowed. Littering and vandalism are strictly
                  prohibited, and no materials may be taped or attached to
                  walls, doors, windows, or any part of the facility. Guests
                  must maintain cleanliness and orderliness in their rooms,
                  avoid flushing tissue paper into toilets, and ensure that
                  lights, air-conditioning units, appliances, and water valves
                  are properly turned off or closed when not in use. Public
                  displays of affection and room hopping are not permitted.
                  Housekeeping personnel are not authorized to enter any room
                  without the presence of a security guard or RCC Supervisor
                  unless the situation necessitates it. Guests may utilize the
                  "Do Not Disturb" sign if they prefer not to have their comfort
                  room cleaned during scheduled housekeeping hours. Any damage
                  to property must be reported immediately, and any damage
                  caused by negligence will be charged to the responsible party.
                  Guests must refrain from shouting, producing loud noises, or
                  engaging in disruptive behavior. Visitation to the garden area
                  during nighttime is strictly prohibited, and the use of exit
                  or emergency doors is only permitted in actual emergency
                  situations. The school curfew of 9:00 PM must be strictly
                  observed, with an allowable extension of one hour only for
                  organizing committee members. Clothes may not be hung outside
                  guest rooms, and all guests must use Gate 3 as their
                  designated entry and exit point. Any violation of these rules
                  will be reported to the organizer for appropriate disciplinary
                  action. Furthermore, the organizing team and its guest
                  participants agree to hold DLSU-Dasmariñas, its
                  administrators, and its employees free from liability for any
                  claims, damages, or demands occurring during the event unless
                  caused by the proven negligence of the University. All
                  guidelines likewise apply to GDO housing accommodations.
                </p>

                <p className="mb-4">
                  Damage fees for furniture, equipment, or other property items
                  depend on their specific type and condition. Guests further
                  acknowledge that room rates exclude meals, that all rates are
                  subject to change without prior notice, that all personal
                  information collected from requisitioners and signatories is
                  held in strict confidentiality, that a finalized reservation
                  signifies full agreement to all facility guidelines, and that
                  certain areas prohibit beverages such as coffee, water, and
                  tea unless otherwise authorized.
                </p>

                <p className="mb-4">
                  By registering for and using the System, the User grants RCC
                  full consent to collect, store, and process their personal
                  data solely for housekeeping and accommodation-related
                  purposes, in accordance with applicable privacy and
                  confidentiality laws. RCC shall not disclose any user
                  information to third parties unless required for official
                  operations, legal compliance, safety, or security reasons.
                  Users understand that all information entered into the System
                  becomes part of RCC's official housekeeping and facility
                  management records. Proceeding with the registration,
                  accessing the System, or continuing to use its services, the
                  User affirms that they have read, understood, and voluntarily
                  agreed to be bound by these Terms and Conditions. The User
                  further acknowledges awareness of all RCC facility rules,
                  operational guidelines, and the responsibilities entrusted to
                  them while using the System. Users fully understand that
                  declining these Terms will prevent the creation of a system
                  account and restrict access to all digital housekeeping
                  services. Continued use of the System shall constitute
                  acceptance of any updated or modified Terms as implemented by
                  RCC.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            By accepting, you agree to these terms and conditions
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-400 text-white rounded font-semibold hover:bg-gray-500 transition"
            >
              Cancel
            </button>

            <button
              onClick={onAccept}
              className="px-6 py-2 bg-green-800 text-white rounded font-semibold hover:bg-green-900 transition"
            >
              Accept Terms & Conditions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsModal;
