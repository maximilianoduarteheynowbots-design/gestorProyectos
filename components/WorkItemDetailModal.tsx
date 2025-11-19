
import React from 'react';
import { type WorkItem, type Comment } from '../types';

interface WorkItemDetailModalProps {
    item: WorkItem;
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}

const formatDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
};

const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
        return dateString;
    }
};

const CommentsLoadingSpinner: React.FC = () => (
     <div className="flex justify-center items-center p-4">
        <svg className="animate-spin h-6 w-6 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const DetailPill: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-md">
        <p className="font-semibold text-gray-600 dark:text-gray-300 text-xs truncate">{label}</p>
        <p className="truncate" title={String(value)}>{String(value)}</p>
    </div>
);

const CommentsSection: React.FC<{ isLoading: boolean; error: string | null; comments: Comment[] }> = ({ isLoading, error, comments }) => {
    if (isLoading) {
        return <CommentsLoadingSpinner />;
    }

    if (error) {
        return (
            <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm">
                <strong>Error:</strong> {error}
            </div>
        );
    }

    if (comments.length > 0) {
        return (
            <ul className="space-y-4">
                {comments.map(comment => (
                    <li key={comment.id} className="bg-light-bg dark:bg-dark-bg p-3 rounded-md">
                        <div className="flex justify-between items-center text-xs mb-1">
                            <p className="font-semibold">{comment.createdBy.displayName}</p>
                            <p className="text-gray-500 dark:text-gray-400">{formatDateTime(comment.createdDate)}</p>
                        </div>
                         <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: comment.renderedText || comment.text }} />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No hay comentarios en este elemento.</p>
    );
};

const tagColors = [
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
];

const getTagColor = (index: number) => tagColors[index % tagColors.length];

export const WorkItemDetailModal: React.FC<WorkItemDetailModalProps> = ({ item, comments, isLoading, error, onClose }) => {
    const fields = item.fields;
    const tags = fields['System.Tags']?.split('; ').filter(Boolean) || [];
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="workItemTitle"
        >
            <div 
                className="bg-light-card dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card z-10">
                    <h2 id="workItemTitle" className="text-xl font-bold text-brand-primary">
                        {`#${item.id} - ${fields['System.Title']}`}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Cerrar modal">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <main className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-sm">
                        <DetailPill label="Tipo de Elemento" value={fields['System.WorkItemType']} />
                        <DetailPill label="Estado" value={fields['System.State']} />
                        <DetailPill label="Asignado a" value={fields['System.AssignedTo']?.displayName ?? 'Sin asignar'} />
                        {fields['System.WorkItemType'].toLowerCase() === 'linea' && (
                            <>
                                <DetailPill label="Fecha (Línea)" value={formatDateOnly(fields['Custom.Fechalinea'])} />
                                <DetailPill label="Horas" value={fields['Custom.Horas'] ?? 'N/A'} />
                            </>
                        )}
                        <DetailPill label="Fecha de Creación" value={formatDateOnly(fields['System.CreatedDate'])} />
                        <DetailPill label="Última Actualización" value={formatDateOnly(fields['System.ChangedDate'])} />
                    </div>

                    {tags.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-lg mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">Etiquetas</h3>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag, index) => (
                                    <span key={tag} className={`text-sm font-medium px-3 py-1 rounded-full ${getTagColor(index)}`}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {fields['System.Description'] && (
                        <div className="mb-6">
                             <h3 className="font-semibold text-lg mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">Descripción</h3>
                             <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: fields['System.Description'] }} />
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold text-lg mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">Comentarios ({isLoading ? '...' : comments.length})</h3>
                        <CommentsSection isLoading={isLoading} error={error} comments={comments} />
                    </div>
                </main>
            </div>
        </div>
    );
};
