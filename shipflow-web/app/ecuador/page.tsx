import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import {
  EcuadorAudienceSection,
  EcuadorBetaStatusSection,
  EcuadorLandingHero,
  EcuadorOperatorsSection,
  EcuadorValueSection,
} from "@/components/EcuadorLandingHero";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "SendiFlash Ecuador | Multicourier en preparacion",
  description: "Plataforma multicourier para cotizar, organizar y gestionar envios locales y nacionales en Ecuador desde una sola cuenta SendiFlash.",
};

export default function EcuadorPage() {
  return (
    <>
      <Header />
      <main>
        <EcuadorLandingHero compact />
        <EcuadorValueSection />
        <EcuadorOperatorsSection />
        <EcuadorAudienceSection />
        <EcuadorBetaStatusSection />
      </main>
      <Footer />
    </>
  );
}
