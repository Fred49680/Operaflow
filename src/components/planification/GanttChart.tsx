"use client";

import { useEffect, useRef, useState } from "react";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import type { ActivitePlanification, GanttTask } from "@/types/planification";

interface GanttChartProps {
  activites: ActivitePlanification[];
  onTaskUpdate?: (task: Partial<GanttTask>) => void;
  onTaskCreate?: (task: Partial<GanttTask>) => void;
  onTaskDelete?: (taskId: string) => void;
  height?: number;
}

export default function GanttChart({
  activites,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  height = 600,
}: GanttChartProps) {
  const ganttContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ganttContainer.current) return;

    // Configuration Gantt
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.config.scale_unit = "day";
    gantt.config.step = 1;
    gantt.config.date_scale = "%d %M";
    gantt.config.subscales = [
      { unit: "hour", step: 1, date: "%H:%i" },
    ];
    gantt.config.scale_height = 60;
    gantt.config.row_height = 40;
    gantt.config.min_column_width = 30;

    // Activer le drag & drop
    gantt.config.drag_move = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_progress = true;
    gantt.config.drag_links = true;

    // Colonnes personnalisées
    gantt.config.columns = [
      { name: "text", label: "Activité", width: 200, tree: true },
      { name: "date_debut_prevue", label: "Début", align: "center", width: 100 },
      { name: "date_fin_prevue", label: "Fin", align: "center", width: 100 },
      { name: "heures_prevues", label: "Heures", align: "center", width: 80 },
      { name: "statut", label: "Statut", align: "center", width: 100 },
    ];

    // Couleurs selon type horaire ou statut
    gantt.templates.task_class = function (start: Date, end: Date, task: { type_horaire?: string; statut?: string }) {
      if (task.type_horaire === "nuit") return "gantt_nuit";
      if (task.type_horaire === "weekend") return "gantt_weekend";
      if (task.type_horaire === "ferie") return "gantt_ferie";
      if (task.statut === "terminee") return "gantt_terminee";
      if (task.statut === "suspendue") return "gantt_suspendue";
      return "";
    };

    // Initialiser Gantt
    gantt.init(ganttContainer.current);

    // Convertir les activités en tâches Gantt
    const tasks = activites.map((act) => ({
      id: act.id,
      text: act.libelle,
      start_date: new Date(act.date_debut_prevue),
      end_date: new Date(act.date_fin_prevue),
      duration: gantt.calculateDuration({
        start_date: new Date(act.date_debut_prevue),
        end_date: new Date(act.date_fin_prevue),
      }),
      progress: act.pourcentage_avancement / 100,
      type: "task",
      open: true,
      activite_id: act.id,
      affaire_id: act.affaire_id,
      type_horaire: act.type_horaire,
      statut: act.statut,
      heures_prevues: act.heures_prevues,
      date_debut_prevue: act.date_debut_prevue,
      date_fin_prevue: act.date_fin_prevue,
    })) as GanttTask[];

    gantt.parse({ data: tasks, links: [] });

    // Événements Gantt
    gantt.attachEvent("onAfterTaskUpdate", (id: string, task: { activite_id?: string; affaire_id?: string; start_date: Date; end_date: Date; progress: number }) => {
      if (onTaskUpdate) {
        onTaskUpdate({
          id,
          activite_id: task.activite_id,
          affaire_id: task.affaire_id,
          date_debut_prevue: task.start_date?.toISOString(),
          date_fin_prevue: task.end_date?.toISOString(),
          start_date: task.start_date?.toISOString(),
          end_date: task.end_date?.toISOString(),
          progress: task.progress * 100,
        });
      }
    });

    gantt.attachEvent("onAfterTaskAdd", (id: string, task: { text: string; start_date: Date; end_date: Date }) => {
      if (onTaskCreate) {
        onTaskCreate({
          id,
          text: task.text,
          date_debut_prevue: task.start_date?.toISOString(),
          date_fin_prevue: task.end_date?.toISOString(),
          start_date: task.start_date?.toISOString(),
          end_date: task.end_date?.toISOString(),
        });
      }
    });

    gantt.attachEvent("onAfterTaskDelete", (id: string) => {
      if (onTaskDelete) {
        onTaskDelete(id);
      }
    });

    // Nettoyage
    return () => {
      const container = ganttContainer.current;
      if (container) {
        gantt.clearAll();
      }
    };
  }, [activites, onTaskUpdate, onTaskCreate, onTaskDelete]);

  return (
    <div className="w-full">
      <style jsx global>{`
        .gantt_container {
          font-family: inherit;
        }
        .gantt_nuit {
          background-color: #3b82f6 !important;
        }
        .gantt_weekend {
          background-color: #f59e0b !important;
        }
        .gantt_ferie {
          background-color: #ef4444 !important;
        }
        .gantt_terminee {
          opacity: 0.6;
        }
        .gantt_suspendue {
          background-color: #94a3b8 !important;
        }
      `}</style>
      <div
        ref={ganttContainer}
        style={{ width: "100%", height: `${height}px` }}
      />
    </div>
  );
}

