export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      actividad: {
        Row: {
          capacidad: number | null
          evento_id: number
          hora_fin: string | null
          hora_inicio: string | null
          id: number
          nombre: string
          tipo_actividad_id: number
        }
        Insert: {
          capacidad?: number | null
          evento_id: number
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          nombre: string
          tipo_actividad_id: number
        }
        Update: {
          capacidad?: number | null
          evento_id?: number
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          nombre?: string
          tipo_actividad_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "actividad_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "actividad_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "actividad_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_funnel_levels"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "actividad_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_hourly_traffic"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "actividad_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "actividad_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "actividad_tipo_actividad_id_fkey"
            columns: ["tipo_actividad_id"]
            isOneToOne: false
            referencedRelation: "tipo_actividad"
            referencedColumns: ["id"]
          },
        ]
      }
      calificacion: {
        Row: {
          actividad_id: number | null
          comentario: string | null
          created_at: string | null
          evento_id: number
          id: number
          puntaje: number
          usuario_id: number
        }
        Insert: {
          actividad_id?: number | null
          comentario?: string | null
          created_at?: string | null
          evento_id: number
          id?: number
          puntaje: number
          usuario_id: number
        }
        Update: {
          actividad_id?: number | null
          comentario?: string | null
          created_at?: string | null
          evento_id?: number
          id?: number
          puntaje?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "calificacion_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificacion_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["actividad_id"]
          },
          {
            foreignKeyName: "calificacion_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificacion_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "calificacion_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "calificacion_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_funnel_levels"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "calificacion_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_hourly_traffic"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "calificacion_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "calificacion_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "calificacion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificacion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_participant_type"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      campana: {
        Row: {
          fecha_fin: string | null
          fecha_inicio: string | null
          id: number
          nombre: string
          objetivo_conversion: string | null
        }
        Insert: {
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: number
          nombre: string
          objetivo_conversion?: string | null
        }
        Update: {
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: number
          nombre?: string
          objetivo_conversion?: string | null
        }
        Relationships: []
      }
      check_in: {
        Row: {
          hora_ingreso: string
          hora_salida: string | null
          id: number
          qr_id: number | null
          registro_id: number
          validado_por: number | null
        }
        Insert: {
          hora_ingreso?: string
          hora_salida?: string | null
          id?: number
          qr_id?: number | null
          registro_id: number
          validado_por?: number | null
        }
        Update: {
          hora_ingreso?: string
          hora_salida?: string | null
          id?: number
          qr_id?: number | null
          registro_id?: number
          validado_por?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_in_qr_id_fkey"
            columns: ["qr_id"]
            isOneToOne: false
            referencedRelation: "qr"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registro_asistido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "v_asistentes"
            referencedColumns: ["registro_id"]
          },
          {
            foreignKeyName: "check_in_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "v_participant_type"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      cupon: {
        Row: {
          canjeado_at: string | null
          codigo: string
          emitido_at: string | null
          estado: Database["public"]["Enums"]["estado_cupon"]
          id: number
          promocion_id: number
          registro_id: number | null
        }
        Insert: {
          canjeado_at?: string | null
          codigo: string
          emitido_at?: string | null
          estado?: Database["public"]["Enums"]["estado_cupon"]
          id?: number
          promocion_id: number
          registro_id?: number | null
        }
        Update: {
          canjeado_at?: string | null
          codigo?: string
          emitido_at?: string | null
          estado?: Database["public"]["Enums"]["estado_cupon"]
          id?: number
          promocion_id?: number
          registro_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cupon_promocion_id_fkey"
            columns: ["promocion_id"]
            isOneToOne: false
            referencedRelation: "promocion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupon_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registro_asistido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupon_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "v_asistentes"
            referencedColumns: ["registro_id"]
          },
        ]
      }
      evento: {
        Row: {
          aliado: string | null
          campana_id: number | null
          ciudad: string | null
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_evento"]
          fecha_fin: string | null
          fecha_inicio: string
          id: number
          lugar: string | null
          nombre: string
          objetivo: string | null
          organizador_id: number
          participantes_esperados: number | null
          presupuesto: number | null
          tipo_evento_id: number
        }
        Insert: {
          aliado?: string | null
          campana_id?: number | null
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_evento"]
          fecha_fin?: string | null
          fecha_inicio: string
          id?: number
          lugar?: string | null
          nombre: string
          objetivo?: string | null
          organizador_id: number
          participantes_esperados?: number | null
          presupuesto?: number | null
          tipo_evento_id: number
        }
        Update: {
          aliado?: string | null
          campana_id?: number | null
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_evento"]
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: number
          lugar?: string | null
          nombre?: string
          objetivo?: string | null
          organizador_id?: number
          participantes_esperados?: number | null
          presupuesto?: number | null
          tipo_evento_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "evento_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "campana"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_organizador_id_fkey"
            columns: ["organizador_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_organizador_id_fkey"
            columns: ["organizador_id"]
            isOneToOne: false
            referencedRelation: "v_participant_type"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "evento_tipo_evento_id_fkey"
            columns: ["tipo_evento_id"]
            isOneToOne: false
            referencedRelation: "tipo_evento"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_producto: {
        Row: {
          evento_id: number
          producto_id: number
        }
        Insert: {
          evento_id: number
          producto_id: number
        }
        Update: {
          evento_id?: number
          producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "evento_producto_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_producto_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "evento_producto_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "evento_producto_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_funnel_levels"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "evento_producto_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_hourly_traffic"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "evento_producto_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "evento_producto_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "evento_producto_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_producto_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "evento_producto_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_ranking_global"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      log_activity: {
        Row: {
          actividad_id: number
          detalle: string | null
          es_conversion: boolean
          fecha_hora: string
          id: number
          registro_id: number
        }
        Insert: {
          actividad_id: number
          detalle?: string | null
          es_conversion?: boolean
          fecha_hora?: string
          id?: number
          registro_id: number
        }
        Update: {
          actividad_id?: number
          detalle?: string | null
          es_conversion?: boolean
          fecha_hora?: string
          id?: number
          registro_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "log_activity_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_activity_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["actividad_id"]
          },
          {
            foreignKeyName: "log_activity_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registro_asistido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_activity_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "v_asistentes"
            referencedColumns: ["registro_id"]
          },
        ]
      }
      preferencia_calif: {
        Row: {
          calificacion: number | null
          id: number
          preferencia: string | null
          producto_id: number
          updated_at: string | null
          usuario_id: number
        }
        Insert: {
          calificacion?: number | null
          id?: number
          preferencia?: string | null
          producto_id: number
          updated_at?: string | null
          usuario_id: number
        }
        Update: {
          calificacion?: number | null
          id?: number
          preferencia?: string | null
          producto_id?: number
          updated_at?: string | null
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "preferencia_calif_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferencia_calif_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "preferencia_calif_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_ranking_global"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "preferencia_calif_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferencia_calif_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_participant_type"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      producto: {
        Row: {
          activo: boolean
          categoria: string | null
          id: number
          nombre: string
          presentacion: string | null
          sabor: string | null
          tipo_producto_id: number
        }
        Insert: {
          activo?: boolean
          categoria?: string | null
          id?: number
          nombre: string
          presentacion?: string | null
          sabor?: string | null
          tipo_producto_id: number
        }
        Update: {
          activo?: boolean
          categoria?: string | null
          id?: number
          nombre?: string
          presentacion?: string | null
          sabor?: string | null
          tipo_producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "producto_tipo_producto_id_fkey"
            columns: ["tipo_producto_id"]
            isOneToOne: false
            referencedRelation: "tipo_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_interaccion: {
        Row: {
          actividad_id: number | null
          calificacion: number | null
          compraria: boolean | null
          fecha_hora: string
          id: number
          nivel_agrado: string | null
          producto_id: number
          quiere_promos: boolean | null
          registro_id: number
        }
        Insert: {
          actividad_id?: number | null
          calificacion?: number | null
          compraria?: boolean | null
          fecha_hora?: string
          id?: number
          nivel_agrado?: string | null
          producto_id: number
          quiere_promos?: boolean | null
          registro_id: number
        }
        Update: {
          actividad_id?: number | null
          calificacion?: number | null
          compraria?: boolean | null
          fecha_hora?: string
          id?: number
          nivel_agrado?: string | null
          producto_id?: number
          quiere_promos?: boolean | null
          registro_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "producto_interaccion_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_interaccion_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["actividad_id"]
          },
          {
            foreignKeyName: "producto_interaccion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_interaccion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_interaccion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_ranking_global"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_interaccion_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registro_asistido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_interaccion_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "v_asistentes"
            referencedColumns: ["registro_id"]
          },
        ]
      }
      promocion: {
        Row: {
          campana_id: number | null
          descripcion: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: number
          nombre: string
          producto_id: number | null
          tipo_promocion_id: number
          valor_descuento: number | null
        }
        Insert: {
          campana_id?: number | null
          descripcion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: number
          nombre: string
          producto_id?: number | null
          tipo_promocion_id: number
          valor_descuento?: number | null
        }
        Update: {
          campana_id?: number | null
          descripcion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: number
          nombre?: string
          producto_id?: number | null
          tipo_promocion_id?: number
          valor_descuento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promocion_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "campana"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "promocion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_ranking_global"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "promocion_tipo_promocion_id_fkey"
            columns: ["tipo_promocion_id"]
            isOneToOne: false
            referencedRelation: "tipo_promocion"
            referencedColumns: ["id"]
          },
        ]
      }
      qr: {
        Row: {
          codigo: string
          generado_at: string
          id: number
          registro_id: number
          usado: boolean
        }
        Insert: {
          codigo: string
          generado_at?: string
          id?: number
          registro_id: number
          usado?: boolean
        }
        Update: {
          codigo?: string
          generado_at?: string
          id?: number
          registro_id?: number
          usado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "qr_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: true
            referencedRelation: "registro_asistido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: true
            referencedRelation: "v_asistentes"
            referencedColumns: ["registro_id"]
          },
        ]
      }
      ranking: {
        Row: {
          calculado_at: string | null
          calificacion_promedio: number | null
          evento_id: number
          id: number
          personas_interesadas: number | null
          porcentaje_interes: number | null
          posicion: number | null
          producto_id: number
        }
        Insert: {
          calculado_at?: string | null
          calificacion_promedio?: number | null
          evento_id: number
          id?: number
          personas_interesadas?: number | null
          porcentaje_interes?: number | null
          posicion?: number | null
          producto_id: number
        }
        Update: {
          calculado_at?: string | null
          calificacion_promedio?: number | null
          evento_id?: number
          id?: number
          personas_interesadas?: number | null
          porcentaje_interes?: number | null
          posicion?: number | null
          producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranking_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "ranking_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "ranking_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_funnel_levels"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "ranking_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_hourly_traffic"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "ranking_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "ranking_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "ranking_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "ranking_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_ranking_global"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      registro_asistido: {
        Row: {
          campana_origen_id: number | null
          codigo_promocional: string | null
          consentimiento: boolean
          es_recurrente: boolean | null
          evento_id: number
          fuente_registro: Database["public"]["Enums"]["fuente_registro"]
          id: number
          registered_at: string
          usuario_id: number
        }
        Insert: {
          campana_origen_id?: number | null
          codigo_promocional?: string | null
          consentimiento?: boolean
          es_recurrente?: boolean | null
          evento_id: number
          fuente_registro: Database["public"]["Enums"]["fuente_registro"]
          id?: number
          registered_at?: string
          usuario_id: number
        }
        Update: {
          campana_origen_id?: number | null
          codigo_promocional?: string | null
          consentimiento?: boolean
          es_recurrente?: boolean | null
          evento_id?: number
          fuente_registro?: Database["public"]["Enums"]["fuente_registro"]
          id?: number
          registered_at?: string
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "registro_asistido_campana_origen_id_fkey"
            columns: ["campana_origen_id"]
            isOneToOne: false
            referencedRelation: "campana"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_funnel_levels"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_hourly_traffic"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_asistido_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_participant_type"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      role: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      seguimiento: {
        Row: {
          detalle: string | null
          fecha: string
          id: number
          registro_id: number
          tipo: Database["public"]["Enums"]["tipo_seguimiento"]
        }
        Insert: {
          detalle?: string | null
          fecha?: string
          id?: number
          registro_id: number
          tipo: Database["public"]["Enums"]["tipo_seguimiento"]
        }
        Update: {
          detalle?: string | null
          fecha?: string
          id?: number
          registro_id?: number
          tipo?: Database["public"]["Enums"]["tipo_seguimiento"]
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registro_asistido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "v_asistentes"
            referencedColumns: ["registro_id"]
          },
        ]
      }
      surveys: {
        Row: {
          atencion: number | null
          comentario: string | null
          experiencias: number | null
          general: number | null
          id: number
          nps: number | null
          organizacion: number | null
          productos: number | null
          registro_id: number
          respondida_at: string | null
        }
        Insert: {
          atencion?: number | null
          comentario?: string | null
          experiencias?: number | null
          general?: number | null
          id?: number
          nps?: number | null
          organizacion?: number | null
          productos?: number | null
          registro_id: number
          respondida_at?: string | null
        }
        Update: {
          atencion?: number | null
          comentario?: string | null
          experiencias?: number | null
          general?: number | null
          id?: number
          nps?: number | null
          organizacion?: number | null
          productos?: number | null
          registro_id?: number
          respondida_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: true
            referencedRelation: "registro_asistido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: true
            referencedRelation: "v_asistentes"
            referencedColumns: ["registro_id"]
          },
        ]
      }
      tipo_actividad: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tipo_evento: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tipo_producto: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tipo_promocion: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      usuario: {
        Row: {
          activo: boolean
          apellido: string | null
          celular: string | null
          ciudad: string | null
          created_at: string
          email: string | null
          id: number
          nombre: string
          password_hash: string | null
          rango_edad: Database["public"]["Enums"]["rango_edad"] | null
          role_id: number
        }
        Insert: {
          activo?: boolean
          apellido?: string | null
          celular?: string | null
          ciudad?: string | null
          created_at?: string
          email?: string | null
          id?: number
          nombre: string
          password_hash?: string | null
          rango_edad?: Database["public"]["Enums"]["rango_edad"] | null
          role_id: number
        }
        Update: {
          activo?: boolean
          apellido?: string | null
          celular?: string | null
          ciudad?: string | null
          created_at?: string
          email?: string | null
          id?: number
          nombre?: string
          password_hash?: string | null
          rango_edad?: Database["public"]["Enums"]["rango_edad"] | null
          role_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "usuario_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
      venta: {
        Row: {
          cantidad: number
          cupon_id: number | null
          fecha_hora: string
          id: number
          monto: number | null
          producto_id: number
          promocion_id: number | null
          registro_id: number | null
        }
        Insert: {
          cantidad?: number
          cupon_id?: number | null
          fecha_hora?: string
          id?: number
          monto?: number | null
          producto_id: number
          promocion_id?: number | null
          registro_id?: number | null
        }
        Update: {
          cantidad?: number
          cupon_id?: number | null
          fecha_hora?: string
          id?: number
          monto?: number | null
          producto_id?: number
          promocion_id?: number | null
          registro_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venta_cupon_id_fkey"
            columns: ["cupon_id"]
            isOneToOne: false
            referencedRelation: "cupon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "venta_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_product_ranking_global"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "venta_promocion_id_fkey"
            columns: ["promocion_id"]
            isOneToOne: false
            referencedRelation: "promocion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registro_asistido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "v_asistentes"
            referencedColumns: ["registro_id"]
          },
        ]
      }
    }
    Views: {
      v_activity_performance: {
        Row: {
          actividad: string | null
          actividad_id: number | null
          capacidad: number | null
          conversiones: number | null
          evento: string | null
          evento_id: number | null
          participaciones: number | null
          participantes_unicos: number | null
          tipo_actividad: string | null
        }
        Relationships: []
      }
      v_asistentes: {
        Row: {
          ciudad: string | null
          consentimiento: boolean | null
          es_recurrente: boolean | null
          evento_id: number | null
          fecha_evento: string | null
          fuente_registro: Database["public"]["Enums"]["fuente_registro"] | null
          hora_ingreso: string | null
          hora_salida: string | null
          rango_edad: Database["public"]["Enums"]["rango_edad"] | null
          registro_id: number | null
          usuario_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_funnel_levels"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_hourly_traffic"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_asistido_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_participant_type"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      v_city_map: {
        Row: {
          asistentes: number | null
          ciudad: string | null
          evento: string | null
          evento_id: number | null
          pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_activity_performance"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_funnel_levels"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_hourly_traffic"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_product_interest"
            referencedColumns: ["evento_id"]
          },
          {
            foreignKeyName: "registro_asistido_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence"
            referencedColumns: ["evento_id"]
          },
        ]
      }
      v_event_kpis: {
        Row: {
          asistentes: number | null
          asistentes_con_actividad: number | null
          campana: string | null
          canjes: number | null
          ciudad: string | null
          conversiones: number | null
          costo_por_asistente: number | null
          degustaciones: number | null
          encuestas_respondidas: number | null
          estado: Database["public"]["Enums"]["estado_evento"] | null
          evento: string | null
          evento_id: number | null
          fecha_inicio: string | null
          indice_satisfaccion: number | null
          interacciones_producto: number | null
          monto_ventas: number | null
          nps: number | null
          nuevos: number | null
          participantes_esperados: number | null
          pct_asistencia: number | null
          pct_meta_asistentes: number | null
          pct_participacion: number | null
          pct_recurrencia: number | null
          permanencia_min: number | null
          presupuesto: number | null
          recurrentes: number | null
          registrados: number | null
          registros_con_consentimiento: number | null
          satisfaccion: number | null
          tasa_conversion: number | null
          tipo_evento: string | null
          ventas_atribuibles: number | null
        }
        Relationships: []
      }
      v_funnel_levels: {
        Row: {
          etapa: string | null
          evento: string | null
          evento_id: number | null
          nivel: number | null
          pct_sobre_visitantes: number | null
          personas: number | null
        }
        Relationships: []
      }
      v_hourly_traffic: {
        Row: {
          checkins: number | null
          evento: string | null
          evento_id: number | null
          franja: string | null
          hora: string | null
          hora_del_dia: number | null
        }
        Relationships: []
      }
      v_participant_type: {
        Row: {
          apellido: string | null
          ciudad: string | null
          eventos_asistidos: number | null
          eventos_registrados: number | null
          nombre: string | null
          rango_edad: Database["public"]["Enums"]["rango_edad"] | null
          tipo_participante: string | null
          usuario_id: number | null
        }
        Relationships: []
      }
      v_product_interest: {
        Row: {
          calificacion_promedio: number | null
          compraria: number | null
          evento: string | null
          evento_id: number | null
          interacciones: number | null
          pct_interes: number | null
          personas_interesadas: number | null
          presentacion: string | null
          producto: string | null
          producto_id: number | null
          quiere_promos: number | null
          ranking: number | null
          sabor: string | null
        }
        Relationships: []
      }
      v_product_ranking_global: {
        Row: {
          calificacion_promedio: number | null
          compraria: number | null
          interacciones: number | null
          pct_compraria: number | null
          personas_interesadas: number | null
          presentacion: string | null
          producto: string | null
          producto_id: number | null
          ranking: number | null
          sabor: string | null
        }
        Relationships: []
      }
      v_recurrence: {
        Row: {
          asistentes: number | null
          evento: string | null
          evento_id: number | null
          fecha_inicio: string | null
          indice_recurrencia: number | null
          nuevos: number | null
          recurrentes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_evento: { Args: { p_evento_id: number }; Returns: boolean }
      current_user_role: { Args: never; Returns: string }
      current_usuario_id: { Args: never; Returns: number }
      evento_id_via_registro: {
        Args: { p_registro_id: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_organizador_of: { Args: { p_evento_id: number }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      usuario_id_via_registro: {
        Args: { p_registro_id: number }
        Returns: number
      }
      validar_qr: { Args: { p_codigo: string }; Returns: boolean }
    }
    Enums: {
      estado_cupon: "emitido" | "canjeado" | "vencido"
      estado_evento: "planificado" | "en_curso" | "cerrado"
      fuente_registro: "formulario" | "qr" | "preinscripcion_web"
      rango_edad:
        | "menor_18"
        | "r18_24"
        | "r25_34"
        | "r35_44"
        | "r45_54"
        | "mayor_55"
      tipo_seguimiento:
        | "encuesta"
        | "mensaje"
        | "cupon_usado"
        | "compra"
        | "otra_activacion"
        | "aceptacion_info"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_cupon: ["emitido", "canjeado", "vencido"],
      estado_evento: ["planificado", "en_curso", "cerrado"],
      fuente_registro: ["formulario", "qr", "preinscripcion_web"],
      rango_edad: [
        "menor_18",
        "r18_24",
        "r25_34",
        "r35_44",
        "r45_54",
        "mayor_55",
      ],
      tipo_seguimiento: [
        "encuesta",
        "mensaje",
        "cupon_usado",
        "compra",
        "otra_activacion",
        "aceptacion_info",
      ],
    },
  },
} as const
