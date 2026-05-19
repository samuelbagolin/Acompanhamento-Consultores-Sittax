import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  where
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth as mainAuth } from '../lib/firebase';
import { User, UserRole, SECTORS } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  User as UserIcon, 
  Mail, 
  Camera, 
  X, 
  Save, 
  Search,
  CheckCircle2,
  XCircle,
  Key,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
// Firebase Config (Hardcoded to match main config)
const firebaseConfig = {
  apiKey: "AIzaSyBhVkTP1B425XmDNkAQjoXTYOkCr5T2HFI",
  authDomain: "acompanhamento-consultores.firebaseapp.com",
  databaseURL: "https://acompanhamento-consultores-default-rtdb.firebaseio.com",
  projectId: "acompanhamento-consultores",
  storageBucket: "acompanhamento-consultores.firebasestorage.app",
  messagingSenderId: "623792488916",
  appId: "1:623792488916:web:29c37d1e20eccc0b9ed641",
  measurementId: "G-9329SWHFBG"
};

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'lider', label: 'Líder de Setor' },
  { value: 'colaborador', label: 'Colaborador' }
];

const cleanObject = (obj: any) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
};

const normalizeId = (id: any) => {
  if (typeof id !== 'string') return '';
  return id.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
};

export const UserManagement: React.FC = () => {
  const { isAdmin, isGestor, userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '', // Only for creation
    cargo: '',
    setor: ['Onboarding'] as string[],
    role: 'colaborador' as UserRole,
    liderSetor: false,
    fotoURL: '',
    ativo: true
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'usuarios'));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      const userSectors = Array.isArray(user.setor) ? user.setor : [user.setor || 'Onboarding'];
      setFormData({
        nome: user.nome,
        email: user.email,
        password: '',
        cargo: user.cargo || '',
        setor: userSectors,
        role: user.role,
        liderSetor: user.liderSetor || false,
        fotoURL: user.fotoURL || '',
        ativo: user.ativo
      });
      setPhotoPreview(user.fotoURL || '');
    } else {
      setEditingUser(null);
      const initialSector = userProfile?.setor 
        ? (Array.isArray(userProfile.setor) ? userProfile.setor[0] : userProfile.setor) 
        : 'Onboarding';
        
      setFormData({
        nome: '',
        email: '',
        password: '',
        cargo: '',
        setor: [initialSector],
        role: 'colaborador',
        liderSetor: false,
        fotoURL: '',
        ativo: true
      });
      setPhotoPreview('');
    }
    setPhotoFile(null);
    setIsModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (formData.fotoURL && !photoFile) return formData.fotoURL;
    if (!photoFile) return editingUser?.fotoURL || null;
    try {
      const storageRef = ref(storage, `profiles/${userId}`);
      await uploadBytes(storageRef, photoFile);
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error('Error uploading photo:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        // Update existing user in Firestore
        const photoUrl = await uploadPhoto(editingUser.uid);
        const mainSector = formData.setor[0] || "Onboarding";
        
        const updateData = cleanObject({
          nome: formData.nome || "",
          cargo: formData.cargo || "",
          setor: (formData.role === 'lider' || formData.role === 'admin') ? formData.setor : mainSector,
          role: formData.role || "colaborador",
          liderSetor: !!formData.liderSetor,
          ativo: !!formData.ativo,
          fotoURL: photoUrl || ""
        });
        
        console.log("FIRESTORE UPDATE DATA:", updateData);
        await updateDoc(doc(db, 'usuarios', editingUser.uid), updateData);
        
        // Sync with global collaborators collection
        const globalColabUpdate = cleanObject({
          nome: formData.nome || "",
          setor: (formData.role === 'lider' || formData.role === 'admin') ? formData.setor : mainSector,
          sectorId: normalizeId(mainSector),
          allSectorIds: (formData.role === 'lider' || formData.role === 'admin') ? formData.setor.map(s => normalizeId(s)) : [normalizeId(mainSector)],
          cargo: formData.cargo || "",
          role: formData.role || "colaborador",
          liderSetor: !!formData.liderSetor,
          fotoURL: photoUrl || ""
        });
        await setDoc(doc(db, 'colaboradores', editingUser.uid), globalColabUpdate, { merge: true });
        
        console.log("FIRESTORE AND COLABORADORES UPDATED");
        toast.success('Usuário atualizado com sucesso');
      } else {
        // Create new user
        if (!formData.password) throw new Error('Senha é obrigatória');
        
        // Use a secondary Firebase app to create user in Auth without logging out current user
        console.log("AUTH METHOD CALLED: createUserWithEmailAndPassword (Secondary App)", formData.email);
        const secondaryApp = initializeApp(firebaseConfig, 'secondary_app');
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth, 
            formData.email, 
            formData.password
          );
          
          const createdUser = userCredential.user;
          const newUserUid = createdUser.uid;
          console.log("AUTH CREATED: UID", newUserUid);
          
          const photoUrl = await uploadPhoto(newUserUid);
          
          // Dados do Firestore
          const userData = {
            uid: newUserUid,
            nome: formData.nome || "",
            email: formData.email || "",
            cargo: formData.cargo || "",
            setor: formData.setor || "Onboarding",
            role: formData.role || "colaborador",
            liderSetor: !!formData.liderSetor,
            ativo: !!formData.ativo,
            fotoURL: photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nome || 'U')}&background=random`,
            createdAt: serverTimestamp()
          };

          // Remove undefined
          const cleanData = cleanObject(userData);

          console.log("DADOS FIRESTORE", cleanData);
          console.log("UID", newUserUid);
          
          await setDoc(doc(db, 'usuarios', newUserUid), cleanData);
          console.log("FIRESTORE SALVO EM USUARIOS");

          // --- Integração Automática com Tabelas e Dashboards ---
          const mainSector = formData.setor[0] || "Onboarding";
          const sectorId = normalizeId(mainSector);
          const allSectorIds = formData.setor.map(s => normalizeId(s));
          
          // 1. Criar registro global em 'colaboradores' como solicitado
          // Para o colaborador, usamos apenas o primeiro setor selecionado
          const globalColabData = cleanObject({
            uid: newUserUid,
            nome: formData.nome || "",
            email: formData.email || "",
            setor: formData.role === 'lider' ? formData.setor : mainSector,
            sectorId: sectorId,
            allSectorIds: formData.role === 'lider' ? allSectorIds : [sectorId],
            cargo: formData.cargo || "",
            role: formData.role || "colaborador",
            liderSetor: !!formData.liderSetor,
            fotoURL: photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nome || 'U')}&background=random`,
            metricas: {},
            avaliacaoAtual: 0,
            ranking: 0,
            status: "ativo",
            createdAt: serverTimestamp()
          });
          await setDoc(doc(db, 'colaboradores', newUserUid), globalColabData);
          console.log("FIRESTORE SALVO EM COLABORADORES (GLOBAL)");

          // 2. Vincular a todos os Meses existentes na coleção 'collaborators' do sistema
          // Apenas para quem é colaborador (pra aparecer nos quadros) ou líderes que precisam estar nos quadros
          if (formData.role !== 'admin') {
            const monthsSnapshot = await getDocs(collection(db, 'months'));
            const months = monthsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (months.length > 0) {
              for (const month of months) {
                const monthId = month.id;
                // Para o quadro, cada colaborador só pode estar em UM setor principal
                const colabRef = doc(collection(db, 'collaborators'));
                const colabData = {
                  uid: newUserUid,
                  name: formData.nome || "",
                  monthId: monthId,
                  sectorId: sectorId,
                  avatarUrl: globalColabData.fotoURL,
                  fotoURL: globalColabData.fotoURL,
                  role: formData.role || "colaborador",
                  createdAt: serverTimestamp()
                };
                await setDoc(colabRef, colabData);
              }
              console.log(`VINCULADO A ${months.length} MESES EM 'collaborators'`);
            }
          }
          // --- Fim da Integração ---
          
          // Importante: deslogar do secondary auth
          await secondaryAuth.signOut();
          console.log("SECONDARY AUTH SIGNED OUT");
          
          toast.success('Usuário criado com sucesso');
        } catch (authErr: any) {
          console.error("ERRO COMPLETO:", authErr);
          throw authErr;
        } finally {
          await deleteApp(secondaryApp);
        }
      }
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      console.error("ERRO AO SALVAR:", err);
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está em uso por outro usuário.');
      } else {
        toast.error(err.message || 'Erro ao salvar usuário');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(mainAuth, email);
      toast.success('E-mail de recuperação enviado para ' + email);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar e-mail de recuperação');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.uid === userId);
    if (userToDelete?.email === 'samuel.bagolin@setuptecnologia.com.br') {
      toast.error('O administrador principal não pode ser excluído.');
      setDeleteConfirm(null);
      return;
    }

    if (!isAdmin && !isGestor) {
      toast.error('Você não tem permissão para esta ação.');
      return;
    }

    setSaving(true);
    try {
      // 1. Delete from 'usuarios'
      await deleteDoc(doc(db, 'usuarios', userId));
      
      // 2. Delete from global 'colaboradores'
      await deleteDoc(doc(db, 'colaboradores', userId));
      
      // 3. Delete from monthly 'collaborators' sessions
      const monthlyColabsQuery = query(collection(db, 'collaborators'), where('uid', '==', userId));
      const monthlyColabsSnap = await getDocs(monthlyColabsQuery);
      for (const d of monthlyColabsSnap.docs) {
        await deleteDoc(d.ref);
      }
      
      // 4. Update UI
      setUsers(users.filter(u => u.uid !== userId));
      toast.success('Usuário removido com sucesso de todas as bases de dados');
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir usuário');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="text-gray-900" size={28} />
          Gerenciamento de Usuários
        </h2>
        
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none w-full"
            />
          </div>
          {(isAdmin || isGestor) && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors shrink-0"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Novo</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Setor / Cargo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        <img 
                          src={user.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome)}&background=random`} 
                          alt={user.nome} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{user.nome}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {Array.isArray(user.setor) ? user.setor.join(', ') : (user.setor || '-')}
                    </div>
                    <div className="text-sm text-gray-500">{user.cargo}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                      user.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                      user.role === 'lider' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {user.role}
                      {user.liderSetor && <span className="ml-1 text-[10px] opacity-75">(Líder)</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.ativo ? (
                      <CheckCircle2 className="text-green-500 mx-auto" size={20} />
                    ) : (
                      <XCircle className="text-red-500 mx-auto" size={20} />
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-gray-400">
                      {(isAdmin || isGestor) && (
                        <>
                          <button 
                            onClick={() => handleResetPassword(user.email)}
                            className="p-2 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                            title="Resetar Senha"
                          >
                            <Key size={18} />
                          </button>
                          {user.email !== 'samuel.bagolin@setuptecnologia.com.br' && (
                            <>
                              <button 
                                onClick={() => handleOpenModal(user)}
                                className="p-2 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirm(user.uid)}
                                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                title="Excluir Usuário"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal User */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                        {photoPreview || formData.fotoURL ? (
                          <img 
                            src={photoPreview || formData.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nome || 'U')}&background=random`} 
                            alt="Preview" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <UserIcon size={48} className="text-gray-300" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-3xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera size={24} />
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-400 text-center">Upload ou use link abaixo</p>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label>
                      <input 
                        required
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Link da Foto (URL)</label>
                      <input 
                        type="text"
                        value={formData.fotoURL}
                        onChange={(e) => {
                          setFormData({...formData, fotoURL: e.target.value});
                          if (!photoFile) setPhotoPreview(e.target.value);
                        }}
                        placeholder="https://exemplo.com/foto.jpg"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">E-mail</label>
                      <input 
                        required
                        disabled={!!editingUser}
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>
                    {!editingUser && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Senha Provisória</label>
                        <input 
                          required
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Cargo</label>
                      <input 
                        type="text"
                        value={formData.cargo}
                        onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none"
                        placeholder="Ex: Gerente"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Setores</label>
                      {formData.role === 'lider' || formData.role === 'admin' ? (
                        <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          {SECTORS.filter(s => {
                            if (isAdmin) return true;
                            const userSectors = Array.isArray(userProfile?.setor) ? userProfile?.setor : [userProfile?.setor];
                            return userSectors.includes(s.name);
                          }).map(s => (
                            <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox"
                                checked={formData.setor.includes(s.name)}
                                onChange={(e) => {
                                  const newSectors = e.target.checked 
                                    ? [...formData.setor, s.name]
                                    : formData.setor.filter(name => name !== s.name);
                                  setFormData({...formData, setor: newSectors});
                                }}                                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                              />
                              <span className="text-sm text-gray-600 group-hover:text-gray-900">{s.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <select 
                          value={formData.setor[0] || 'Onboarding'}
                          onChange={(e) => setFormData({...formData, setor: [e.target.value]})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none"
                        >
                          {SECTORS.filter(s => {
                            if (isAdmin) return true;
                            const userSectors = Array.isArray(userProfile?.setor) ? userProfile?.setor : [userProfile?.setor];
                            return userSectors.includes(s.name);
                          }).map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nível de Acesso</label>
                      <select 
                        value={formData.role}
                        disabled={!isAdmin}
                        onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none disabled:bg-gray-50"
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="block text-sm font-bold text-gray-700">Configurações</label>
                       <div className="flex gap-4 items-center h-12">
                         <label className="flex items-center gap-2 cursor-pointer">
                           <input 
                            type="checkbox"
                            checked={formData.liderSetor}
                            onChange={(e) => setFormData({...formData, liderSetor: e.target.checked})}
                            className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                           />
                           <span className="text-sm font-medium">Líder</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                           <input 
                            type="checkbox"
                            checked={formData.ativo}
                            onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                            className="w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
                           />
                           <span className="text-sm font-medium">Ativo</span>
                         </label>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <Save size={20} />
                        Salvar Usuário
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Excluir Usuário?</h3>
                <p className="text-gray-500 mt-2">
                  Esta ação removerá o usuário do Firestore (usuarios, colaboradores e sessões mensais).
                  O acesso na Autenticação continuará existindo mas sem perfil vinculado.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteUser(deleteConfirm)}
                  disabled={saving}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400"
                >
                  {saving ? 'Excluindo...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
