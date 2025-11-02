"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";

type UserData = {
  id: string;
  email: string;
  statut: string;
  collaborateur_id: string | null;
  date_creation: string;
  derniere_connexion: string | null;
  password_expires_at: string | null;
  roles?: { name: string; description: string | null } | null;
  collaborateurs?: {
    nom: string;
    prenom: string;
    email: string;
    site: string | null;
  } | null;
};

type UserRole = {
  roles?: { name: string; description: string | null }[] | { name: string; description: string | null } | null;
  site_id: string | null;
};

interface Props {
  user: User;
  userData: UserData | null;
  userRoles: UserRole[];
  isAdmin: boolean;
  isRH: boolean;
}

export default function ProfileClient({
  user,
  userData,
  userRoles,
  isAdmin,
  isRH,
}: Props) {
  const [activeTab, setActiveTab] = useState<"role" | "rh">("role");

  const getStatusBadge = (statut: string) => {
    const styles = {
      actif: "bg-green-100 text-green-800 border border-green-300",
      inactif: "bg-gray-100 text-gray-800 border border-gray-300",
      suspendu: "bg-red-100 text-red-800 border border-red-300",
      en_attente: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          styles[statut as keyof typeof styles] || styles.inactif
        }`}
      >
        {statut}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Mon profil</h1>
          <p className="text-lg text-secondary">
            Gérer mes informations personnelles et mes accès
          </p>
        </div>


        {/* Carte principale */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-secondary">
                {userData?.collaborateurs
                  ? `${userData.collaborateurs.prenom} ${userData.collaborateurs.nom}`
                  : user.email}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
            <div className="text-right">
              {userData && getStatusBadge(userData.statut)}
              {!userData?.collaborateur_id && (
                <p className="mt-2 text-sm text-yellow-600">
                  ⚠️ Profil RH non assigné
                </p>
              )}
            </div>
          </div>

          {/* Onglets */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("role")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "role"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Rôle applicatif
                {!isAdmin && (
                  <span className="ml-2 text-xs text-gray-400">(lecture seule)</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("rh")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "rh"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Profil RH
                {!isRH && (
                  <span className="ml-2 text-xs text-gray-400">(lecture seule)</span>
                )}
              </button>
            </nav>
          </div>

          {/* Contenu onglet Rôle */}
          {activeTab === "role" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-secondary mb-2">
                  Rôles attribués
                </h3>
                {userRoles.length > 0 ? (
                  <ul className="space-y-2">
                    {userRoles.map((ur, index) => {
                      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
                      return (
                        <li key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-secondary">
                              {role?.name}
                            </span>
                            {ur.site_id && (
                              <span className="ml-2 text-sm text-gray-500">
                                (Site: {ur.site_id})
                              </span>
                            )}
                            {role?.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {role.description}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-gray-500">Aucun rôle attribué</p>
                )}
              </div>

              {userData?.password_expires_at && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Votre mot de passe provisoire expire le{" "}
                    {new Date(userData.password_expires_at).toLocaleDateString("fr-FR")}.
                    Veuillez le changer prochainement.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contenu onglet Profil RH */}
          {activeTab === "rh" && (
            <div className="space-y-4">
              {userData?.collaborateurs ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Nom
                    </label>
                    <p className="text-gray-700">{userData.collaborateurs.nom}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Prénom
                    </label>
                    <p className="text-gray-700">{userData.collaborateurs.prenom}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Email
                    </label>
                    <p className="text-gray-700">{userData.collaborateurs.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Site
                    </label>
                    <p className="text-gray-700">
                      {userData.collaborateurs.site || "Non défini"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Aucun profil RH associé à votre compte.
                  </p>
                  {isRH && (
                    <button className="btn-primary">
                      Créer un profil RH
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Informations supplémentaires */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-secondary mb-4">
              Informations de connexion
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">Date de création</label>
                <p className="text-gray-700">
                  {userData?.date_creation
                    ? new Date(userData.date_creation).toLocaleDateString("fr-FR")
                    : "Non disponible"}
                </p>
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Dernière connexion</label>
                <p className="text-gray-700">
                  {userData?.derniere_connexion
                    ? new Date(userData.derniere_connexion).toLocaleDateString("fr-FR")
                    : "Jamais"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

